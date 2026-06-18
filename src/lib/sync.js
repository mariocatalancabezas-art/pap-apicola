import { db, SYNC_STATUS } from './db'
import { supabase, isSupabaseConfigured } from './supabase'

let isSyncing = false
let syncListeners = []
let fullSyncInProgress = false

export function onSyncChange(fn) {
  syncListeners.push(fn)
  return () => { syncListeners = syncListeners.filter(l => l !== fn) }
}

function notifySyncListeners(status) {
  syncListeners.forEach(fn => fn(status))
}

export async function syncAll(forceFull = false) {
  if (!isSupabaseConfigured() || !navigator.onLine || isSyncing) return
  isSyncing = true
  fullSyncInProgress = forceFull
  notifySyncListeners('syncing')

  try {
    await pushLocalChanges()
    await pullRemoteChanges(forceFull)
    await syncDeletions()
    notifySyncListeners('synced')
  } catch (err) {
    console.error('[Sync] Error:', err)
    notifySyncListeners('error')
  } finally {
    isSyncing = false
    fullSyncInProgress = false
  }
}

async function pushLocalChanges() {
  // Primero enviar los pendientes
  const pendingVisitas = await db.visitas
    .where('sync_status').equals(SYNC_STATUS.PENDING)
    .toArray()

  for (const item of pendingVisitas) {
    const { id: localId, ...payload } = item
    
    // Si está marcado para eliminación
    if (payload.deleted_at) {
      await supabase.from('visitas').delete().eq('uuid', payload.uuid)
      await db.visitas.delete(item.id)
      continue
    }
    
    const { error } = await supabase
      .from('visitas')
      .upsert({ ...payload }, { onConflict: 'uuid' })

    if (!error) {
      await db.visitas.update(item.id, { sync_status: SYNC_STATUS.SYNCED })
    }
  }
}

async function pullRemoteChanges(forceFull = false) {
  // En sync completo, traer todos los registros recientes (últimos 90 días)
  // En sync normal, solo traer los más recientes que el último sync
  let query = supabase.from('visitas').select('*')
  
  if (!forceFull) {
    const lastSync = localStorage.getItem('last_sync_at') || '1970-01-01T00:00:00Z'
    query = query.gt('updated_at', lastSync)
  } else {
    // Sync completo: traer últimos 90 días para no sobrecargar
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    query = query.gt('updated_at', ninetyDaysAgo.toISOString())
  }

  const { data: remoteVisitas, error: err2 } = await query

  if (!err2 && remoteVisitas) {
    for (const remote of remoteVisitas) {
      // Si el remoto está marcado como eliminado, borrar localmente
      if (remote.deleted_at) {
        const existing = await db.visitas.where('uuid').equals(remote.uuid).first()
        if (existing) {
          await db.visitas.delete(existing.id)
        }
        continue
      }
      
      const existing = await db.visitas.where('uuid').equals(remote.uuid).first()
      if (!existing) {
        await db.visitas.add({ ...remote, sync_status: SYNC_STATUS.SYNCED })
      } else if (new Date(remote.updated_at) > new Date(existing.updated_at)) {
        await db.visitas.update(existing.id, { ...remote, sync_status: SYNC_STATUS.SYNCED })
      }
    }
  }

  localStorage.setItem('last_sync_at', new Date().toISOString())
}

async function syncDeletions() {
  // Enviar eliminaciones locales al servidor
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  
  // Obtener UUIDs locales marcados como eliminados (soft delete)
  const localDeleted = await db.visitas.where('deleted_at').above('').toArray()
  
  for (const item of localDeleted) {
    await supabase.from('visitas').delete().eq('uuid', item.uuid)
    await db.visitas.delete(item.id)
  }
}

export function setupAutoSync() {
  window.addEventListener('online', () => {
    setTimeout(syncAll, 1000)
  })

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && navigator.onLine) syncAll()
  })

  if (navigator.onLine) {
    setTimeout(syncAll, 2000)
  }

  setInterval(() => {
    if (navigator.onLine) syncAll()
  }, 30 * 1000)
}

export async function getPendingCount() {
  return await db.visitas.where('sync_status').equals(SYNC_STATUS.PENDING).count()
}
