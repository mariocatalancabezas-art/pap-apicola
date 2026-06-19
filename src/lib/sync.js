import { db, SYNC_STATUS } from './db'
import { supabase, isSupabaseConfigured } from './supabase'

let isSyncing = false
let syncListeners = []
let fullSyncInProgress = false
let hasDoneInitialSync = false

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
    console.log('[Sync] Iniciando sincronización', forceFull ? 'COMPLETA' : 'incremental')
    
    // 1. Primero enviar cambios locales pendientes
    await pushLocalChanges()
    
    // 2. Sincronizar apicultores
    await syncApicultores(forceFull)
    
    // 3. Traer cambios remotos
    await pullRemoteChanges(forceFull)
    
    // 4. Procesar eliminaciones
    await syncDeletions()
    
    hasDoneInitialSync = true
    localStorage.setItem('last_sync_at', new Date().toISOString())
    notifySyncListeners('synced')
    console.log('[Sync] Completada exitosamente')
  } catch (err) {
    console.error('[Sync] Error:', err)
    notifySyncListeners('error')
  } finally {
    isSyncing = false
    fullSyncInProgress = false
  }
}

// Sincronización de apicultores
async function syncApicultores(forceFull = false) {
  console.log('[Sync] Sincronizando apicultores...')
  
  // 1. Enviar apicultores locales pendientes
  const pendingApicultores = await db.apicultores
    .where('sync_status').equals(SYNC_STATUS.PENDING)
    .toArray()
  
  for (const item of pendingApicultores) {
    const { id: localId, sync_status, ...payload } = item
    
    if (payload.deleted_at) {
      // Soft delete en servidor
      await supabase
        .from('apicultores')
        .update({ deleted_at: payload.deleted_at, updated_at: new Date().toISOString() })
        .eq('uuid', payload.uuid)
      await db.apicultores.delete(item.id)
      continue
    }
    
    const { error } = await supabase
      .from('apicultores')
      .upsert({ ...payload }, { onConflict: 'uuid' })
    
    if (!error) {
      await db.apicultores.update(item.id, { sync_status: SYNC_STATUS.SYNCED })
    }
  }
  
  // 2. Traer apicultores del servidor
  let query = supabase.from('apicultores').select('*').is('deleted_at', null)
  
  if (!forceFull) {
    const lastSync = localStorage.getItem('last_sync_apicultores') || '1970-01-01T00:00:00Z'
    query = query.gt('updated_at', lastSync)
  }
  
  const { data: remoteApicultores, error } = await query
  
  if (error) {
    console.error('[Sync] Error al traer apicultores:', error)
    return
  }
  
  if (remoteApicultores && remoteApicultores.length > 0) {
    console.log(`[Sync] Recibidos ${remoteApicultores.length} apicultores`)
    
    for (const remote of remoteApicultores) {
      const existing = await db.apicultores.where('uuid').equals(remote.uuid).first()
      
      if (!existing) {
        await db.apicultores.add({ 
          ...remote, 
          id: undefined, // Dejar que Dexie asigne nuevo id local
          sync_status: SYNC_STATUS.SYNCED 
        })
      } else if (new Date(remote.updated_at) > new Date(existing.updated_at || 0)) {
        await db.apicultores.update(existing.id, { 
          ...remote, 
          id: existing.id, // Mantener id local
          sync_status: SYNC_STATUS.SYNCED 
        })
      }
    }
  }
  
  localStorage.setItem('last_sync_apicultores', new Date().toISOString())
  console.log('[Sync] Apicultores sincronizados')
}

async function pushLocalChanges() {
  console.log('[Sync] Enviando cambios locales de visitas...')
  
  const pendingVisitas = await db.visitas
    .where('sync_status').equals(SYNC_STATUS.PENDING)
    .toArray()
  
  console.log(`[Sync] ${pendingVisitas.length} visitas pendientes de sincronizar`)

  for (const item of pendingVisitas) {
    const { id: localId, sync_status, ...payload } = item
    
    // Si está marcado para eliminación
    if (payload.deleted_at) {
      await supabase
        .from('visitas')
        .update({ deleted_at: payload.deleted_at, updated_at: new Date().toISOString() })
        .eq('uuid', payload.uuid)
      await db.visitas.delete(item.id)
      continue
    }
    
    const { error } = await supabase
      .from('visitas')
      .upsert({ ...payload }, { onConflict: 'uuid' })

    if (!error) {
      await db.visitas.update(item.id, { sync_status: SYNC_STATUS.SYNCED })
    } else {
      console.error('[Sync] Error al sincronizar visita:', error)
    }
  }
}

async function pullRemoteChanges(forceFull = false) {
  console.log('[Sync] Trayendo cambios remotos de visitas...')
  
  // Si es full sync, primero limpiar locales que no están en servidor
  if (forceFull) {
    console.log('[Sync] Modo FULL SYNC - limpiando datos locales antiguos')
    // Obtener todos los UUIDs locales
    const localVisitas = await db.visitas.toArray()
    const { data: remoteUUIDs } = await supabase
      .from('visitas')
      .select('uuid')
      .is('deleted_at', null)
    
    if (remoteUUIDs) {
      const remoteUUIDSet = new Set(remoteUUIDs.map(v => v.uuid))
      // Eliminar locales que no existen en servidor (fueron eliminados en otro dispositivo)
      for (const local of localVisitas) {
        if (!remoteUUIDSet.has(local.uuid) && local.sync_status === SYNC_STATUS.SYNCED) {
          console.log(`[Sync] Eliminando visita local que ya no existe en servidor: ${local.uuid}`)
          await db.visitas.delete(local.id)
        }
      }
    }
  }
  
  // Traer registros actualizados del servidor
  let query = supabase.from('visitas').select('*').is('deleted_at', null)
  
  if (!forceFull) {
    const lastSync = localStorage.getItem('last_sync_at') || '1970-01-01T00:00:00Z'
    query = query.gt('updated_at', lastSync)
  }
  
  const { data: remoteVisitas, error } = await query

  if (error) {
    console.error('[Sync] Error al traer visitas:', error)
    return
  }
  
  if (remoteVisitas && remoteVisitas.length > 0) {
    console.log(`[Sync] Recibidas ${remoteVisitas.length} visitas del servidor`)
    
    for (const remote of remoteVisitas) {
      const existing = await db.visitas.where('uuid').equals(remote.uuid).first()
      
      if (!existing) {
        // Nuevo registro - agregar
        await db.visitas.add({ 
          ...remote, 
          id: undefined, // Dejar que Dexie asigne nuevo id local
          sync_status: SYNC_STATUS.SYNCED 
        })
      } else if (new Date(remote.updated_at) > new Date(existing.updated_at || 0)) {
        // Actualizar si el remoto es más nuevo
        await db.visitas.update(existing.id, { 
          ...remote, 
          id: existing.id, // Mantener id local
          sync_status: SYNC_STATUS.SYNCED 
        })
      }
    }
  }
}

async function syncDeletions() {
  console.log('[Sync] Procesando eliminaciones...')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  
  // Procesar eliminaciones de visitas
  const localDeletedVisitas = await db.visitas.where('deleted_at').above('').toArray()
  console.log(`[Sync] ${localDeletedVisitas.length} visitas marcadas para eliminación`)
  
  for (const item of localDeletedVisitas) {
    await supabase
      .from('visitas')
      .update({ deleted_at: item.deleted_at, updated_at: new Date().toISOString() })
      .eq('uuid', item.uuid)
    await db.visitas.delete(item.id)
  }
  
  // Procesar eliminaciones de apicultores
  const localDeletedApicultores = await db.apicultores.where('deleted_at').above('').toArray()
  console.log(`[Sync] ${localDeletedApicultores.length} apicultores marcados para eliminación`)
  
  for (const item of localDeletedApicultores) {
    await supabase
      .from('apicultores')
      .update({ deleted_at: item.deleted_at, updated_at: new Date().toISOString() })
      .eq('uuid', item.uuid)
    await db.apicultores.delete(item.id)
  }
}

export function setupAutoSync() {
  console.log('[Sync] Configurando auto-sync...')
  
  // Evento: volver a estar online
  window.addEventListener('online', () => {
    console.log('[Sync] Conexión restaurada, sincronizando...')
    setTimeout(() => syncAll(false), 500)
  })

  // Evento: cambio de visibilidad (usuario vuelve a la app)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && navigator.onLine) {
      console.log('[Sync] App visible, sincronizando...')
      syncAll(false)
    }
  })

  // Sync INMEDIATO al iniciar la app (no esperar 2 segundos)
  // y hacer FULL SYNC para dispositivos nuevos o que no han sincronizado
  if (navigator.onLine) {
    const lastSync = localStorage.getItem('last_sync_at')
    const isNewDevice = !lastSync
    
    if (isNewDevice) {
      console.log('[Sync] Nuevo dispositivo detectado - ejecutando FULL SYNC inmediato')
      syncAll(true) // Full sync para nuevo dispositivo
    } else {
      console.log('[Sync] Sincronización normal al iniciar')
      syncAll(false)
    }
  }

  // Sync periódico cada 30 segundos
  setInterval(() => {
    if (navigator.onLine) syncAll(false)
  }, 30 * 1000)
}

// Función para forzar sincronización completa (útil para debugging)
export async function forceFullSync() {
  console.log('[Sync] Forzando sincronización completa...')
  await syncAll(true)
}

export async function getPendingCount() {
  const pendingVisitas = await db.visitas.where('sync_status').equals(SYNC_STATUS.PENDING).count()
  const pendingApicultores = await db.apicultores.where('sync_status').equals(SYNC_STATUS.PENDING).count()
  return pendingVisitas + pendingApicultores
}

// Función helper para verificar estado de sync
export async function getSyncStatus() {
  const visitasTotal = await db.visitas.count()
  const visitasSynced = await db.visitas.where('sync_status').equals(SYNC_STATUS.SYNCED).count()
  const visitasPending = await db.visitas.where('sync_status').equals(SYNC_STATUS.PENDING).count()
  
  const apicultoresTotal = await db.apicultores.count()
  const apicultoresSynced = await db.apicultores.where('sync_status').equals(SYNC_STATUS.SYNCED).count()
  const apicultoresPending = await db.apicultores.where('sync_status').equals(SYNC_STATUS.PENDING).count()
  
  return {
    visitas: { total: visitasTotal, synced: visitasSynced, pending: visitasPending },
    apicultores: { total: apicultoresTotal, synced: apicultoresSynced, pending: apicultoresPending },
    lastSync: localStorage.getItem('last_sync_at'),
    isOnline: navigator.onLine,
    isSyncing: isSyncing
  }
}
