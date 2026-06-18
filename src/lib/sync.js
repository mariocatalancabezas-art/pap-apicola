import { db, SYNC_STATUS } from './db'
import { supabase, isSupabaseConfigured } from './supabase'

let isSyncing = false
let syncListeners = []

export function onSyncChange(fn) {
  syncListeners.push(fn)
  return () => { syncListeners = syncListeners.filter(l => l !== fn) }
}

function notifySyncListeners(status) {
  syncListeners.forEach(fn => fn(status))
}

export async function syncAll() {
  if (!isSupabaseConfigured() || !navigator.onLine || isSyncing) return
  isSyncing = true
  notifySyncListeners('syncing')

  try {
    await pushLocalChanges()
    await pullRemoteChanges()
    notifySyncListeners('synced')
  } catch (err) {
    console.error('[Sync] Error:', err)
    notifySyncListeners('error')
  } finally {
    isSyncing = false
  }
}

async function pushLocalChanges() {
  const pendingVisitas = await db.visitas
    .where('sync_status').equals(SYNC_STATUS.PENDING)
    .toArray()

  for (const item of pendingVisitas) {
    const { id: localId, ...payload } = item
    const { error } = await supabase
      .from('visitas')
      .upsert({ ...payload }, { onConflict: 'uuid' })

    if (!error) {
      await db.visitas.update(item.id, { sync_status: SYNC_STATUS.SYNCED })
    }
  }
}

async function pullRemoteChanges() {
  const lastSync = localStorage.getItem('last_sync_at') || '1970-01-01T00:00:00Z'

  const { data: remoteVisitas, error: err2 } = await supabase
    .from('visitas')
    .select('*')
    .gt('updated_at', lastSync)

  if (!err2 && remoteVisitas) {
    for (const remote of remoteVisitas) {
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
