import { db, SYNC_STATUS } from './db'
import { supabase, isSupabaseConfigured } from './supabase'

let isSyncing = false
let pendingSync = false
let syncListeners = []
let fullSyncInProgress = false
let hasDoneInitialSync = false
let autoSyncSetup = false

export function onSyncChange(fn) {
  syncListeners.push(fn)
  return () => { syncListeners = syncListeners.filter(l => l !== fn) }
}

function notifySyncListeners(status) {
  syncListeners.forEach(fn => fn(status))
}

export async function syncAll(forceFull = false) {
  console.log('[Sync] syncAll llamado, forceFull=', forceFull)
  console.log('[Sync] isSupabaseConfigured:', isSupabaseConfigured())
  console.log('[Sync] navigator.onLine:', navigator.onLine)
  console.log('[Sync] isSyncing:', isSyncing)
  
  if (!isSupabaseConfigured()) {
    console.error('[Sync] ERROR: Supabase no está configurado')
    return
  }
  if (!navigator.onLine) {
    console.log('[Sync] Sin conexión, abortando')
    return
  }
  if (isSyncing) {
    console.log('[Sync] Ya hay sync en progreso, encolando')
    pendingSync = true
    return
  }
  
  do {
    const runFullSync = forceFull || pendingSync
    pendingSync = false
    isSyncing = true
    fullSyncInProgress = runFullSync
    notifySyncListeners('syncing')

    try {
      console.log('[Sync] Iniciando sincronización', fullSyncInProgress ? 'COMPLETA' : 'incremental')
      
      // 1. Primero enviar cambios locales pendientes
      console.log('[Sync] Paso 1: pushLocalChanges')
      await pushLocalChanges()
      
      // 2. Sincronizar apicultores
      console.log('[Sync] Paso 2: syncApicultores')
      await syncApicultores(fullSyncInProgress)
      
      // 3. Traer cambios remotos
      console.log('[Sync] Paso 3: pullRemoteChanges')
      await pullRemoteChanges(fullSyncInProgress)
      
      // 4. Procesar eliminaciones
      console.log('[Sync] Paso 4: syncDeletions')
      await syncDeletions()
      
      hasDoneInitialSync = true
      localStorage.setItem('last_sync_at', new Date().toISOString())
      notifySyncListeners('synced')
      console.log('[Sync] Completada exitosamente')
    } catch (err) {
      console.error('[Sync] Error:', err)
      console.error('[Sync] Stack:', err.stack)
      notifySyncListeners('error')
    } finally {
      isSyncing = false
      fullSyncInProgress = false
    }
  } while (pendingSync)
}

// Sincronización de apicultores
async function syncApicultores(forceFull = false) {
  console.log('[Sync] Sincronizando apicultores...')
  
  // 1. Enviar apicultores locales pendientes
  const pendingApicultores = await db.apicultores
    .where('sync_status').equals(SYNC_STATUS.PENDING)
    .toArray()
  
  console.log(`[Sync] ${pendingApicultores.length} apicultores pendientes, ${pendingApicultores.filter(a => a.deleted_at).length} eliminados`)  
  
  let pushErrors = []
  for (const item of pendingApicultores) {
    const { id: localId, sync_status, ...payload } = item
    
    if (payload.deleted_at) {
      // Soft delete en servidor
      const { error } = await supabase
        .from('apicultores')
        .update({ deleted_at: payload.deleted_at, updated_at: new Date().toISOString() })
        .eq('uuid', payload.uuid)
      if (error) {
        console.error('[Sync] Error al eliminar apicultor en servidor:', error)
        pushErrors.push(error)
      } else {
        await db.apicultores.delete(item.id)
      }
      continue
    }
    
    const { error } = await supabase
      .from('apicultores')
      .upsert({ ...payload }, { onConflict: 'uuid' })
    
    if (error) {
      console.error('[Sync] Error al sincronizar apicultor:', error)
      pushErrors.push(error)
    } else {
      await db.apicultores.update(item.id, { sync_status: SYNC_STATUS.SYNCED })
    }
  }
  
  if (pushErrors.length > 0) {
    throw new Error(`${pushErrors.length} apicultores no pudieron sincronizarse`)
  }
  
  // 2. En modo full sync, eliminar locales que no existen en servidor
  if (forceFull) {
    const localApicultores = await db.apicultores.toArray()
    const { data: remoteUUIDs } = await supabase
      .from('apicultores')
      .select('uuid')
      .is('deleted_at', null)
    
    if (remoteUUIDs) {
      const remoteUUIDSet = new Set(remoteUUIDs.map(a => a.uuid))
      for (const local of localApicultores) {
        if (!remoteUUIDSet.has(local.uuid) && local.sync_status === SYNC_STATUS.SYNCED) {
          console.log(`[Sync] Eliminando apicultor local que ya no existe en servidor: ${local.uuid}`)
          await db.apicultores.delete(local.id)
        }
      }
    }
  }
  
  // 3. Traer apicultores del servidor
  let query = supabase.from('apicultores').select('*').is('deleted_at', null)
  
  if (!forceFull) {
    const lastSync = localStorage.getItem('last_sync_apicultores') || '1970-01-01T00:00:00Z'
    query = query.gt('updated_at', lastSync)
  }
  
  const { data: remoteApicultores, error } = await query
  
  if (error) {
    console.error('[Sync] Error al traer apicultores:', error)
    throw error
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
      } else if (existing.sync_status !== SYNC_STATUS.PENDING && new Date(remote.updated_at) > new Date(existing.updated_at || 0)) {
        // No sobrescribir registros locales pendientes (evita que una eliminación en curso se revierta)
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

  let errors = []
  for (const item of pendingVisitas) {
    const { id: localId, sync_status, ...payload } = item
    // Preguntas ASB: solo locales, no sincronizar con Supabase
    delete payload.asb_anios_apicultura
    delete payload.asb_motivacion
    delete payload.asb_talleres_interes
    console.log(`[Sync] Enviando visita UUID: ${payload.uuid}, Nombre: ${payload.f1_nombre}`)
    
    // Si está marcado para eliminación
    if (payload.deleted_at) {
      console.log(`[Sync] Marcando como eliminada: ${payload.uuid}`)
      const { error } = await supabase
        .from('visitas')
        .update({ deleted_at: payload.deleted_at, updated_at: new Date().toISOString() })
        .eq('uuid', payload.uuid)
      if (error) {
        console.error('[Sync] Error al eliminar en servidor:', error)
        errors.push(error)
      } else {
        await db.visitas.delete(item.id)
      }
      continue
    }
    
    const { data, error } = await supabase
      .from('visitas')
      .upsert({ ...payload }, { onConflict: 'uuid' })
      .select()

    if (error) {
      console.error('[Sync] Error al sincronizar visita:', error)
      console.error('[Sync] Error detalles:', error.message, error.code)
      errors.push(error)
    } else {
      console.log(`[Sync] Visita sincronizada exitosamente: ${payload.uuid}`)
      await db.visitas.update(item.id, { sync_status: SYNC_STATUS.SYNCED })
    }
  }

  if (errors.length > 0) {
    throw new Error(`${errors.length} visitas no pudieron sincronizarse`)
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
    throw error
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
      } else if (existing.sync_status !== SYNC_STATUS.PENDING && new Date(remote.updated_at) > new Date(existing.updated_at || 0)) {
        // Actualizar si el remoto es más nuevo, pero no sobrescribir locales pendientes
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
  let errors = []
  
  // Procesar eliminaciones de visitas
  const localDeletedVisitas = await db.visitas.where('deleted_at').above('').toArray()
  console.log(`[Sync] ${localDeletedVisitas.length} visitas marcadas para eliminación`)
  
  for (const item of localDeletedVisitas) {
    const { error } = await supabase
      .from('visitas')
      .update({ deleted_at: item.deleted_at, updated_at: new Date().toISOString() })
      .eq('uuid', item.uuid)
    if (error) {
      console.error('[Sync] Error al sincronizar eliminación de visita:', error)
      errors.push(error)
    } else {
      await db.visitas.delete(item.id)
    }
  }
  
  // Procesar eliminaciones de apicultores
  const localDeletedApicultores = await db.apicultores.where('deleted_at').above('').toArray()
  console.log(`[Sync] ${localDeletedApicultores.length} apicultores marcados para eliminación`)
  
  for (const item of localDeletedApicultores) {
    const { error } = await supabase
      .from('apicultores')
      .update({ deleted_at: item.deleted_at, updated_at: new Date().toISOString() })
      .eq('uuid', item.uuid)
    if (error) {
      console.error('[Sync] Error al sincronizar eliminación de apicultor:', error)
      errors.push(error)
    } else {
      await db.apicultores.delete(item.id)
    }
  }

  if (errors.length > 0) {
    throw new Error(`${errors.length} eliminaciones no pudieron sincronizarse`)
  }
}

export function setupAutoSync() {
  if (autoSyncSetup) {
    console.log('[Sync] Auto-sync ya configurado, ignorando llamada duplicada')
    return
  }
  autoSyncSetup = true
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

  // Sync INMEDIATO al iniciar la app
  if (navigator.onLine) {
    const lastSync = localStorage.getItem('last_sync_at')
    const hardResetDone = localStorage.getItem('hard_reset_done')
    const isNewDevice = !lastSync || !hardResetDone
    
    if (isNewDevice) {
      console.log('[Sync] Nuevo dispositivo detectado - ejecutando HARD RESET')
      // Usar setTimeout para no bloquear el inicio de la app
      setTimeout(() => hardResetAndSync(), 100)
    } else {
      console.log('[Sync] Sincronización normal al iniciar')
      syncAll(true) // Forzar full sync en cada inicio para asegurar consistencia
    }
  }

  // Sync periódico cada 60 segundos - full sync para garantizar consistencia
  setInterval(() => {
    if (navigator.onLine) syncAll(true)
  }, 60 * 1000)
}

// Exponer funciones globales para debugging
if (typeof window !== 'undefined') {
  window.hardResetAndSync = hardResetAndSync
  window.forceFullSync = forceFullSync
  window.getSyncStatus = getSyncStatus
}

// Función para forzar sincronización completa (útil para debugging)
export async function forceFullSync() {
  console.log('[Sync] Forzando sincronización completa...')
  await syncAll(true)
}

// Función de HARD RESET - limpia todo local y trae desde servidor
export async function hardResetAndSync() {
  console.log('[Sync] HARD RESET - Limpiando base de datos local...')
  
  if (!isSupabaseConfigured() || !navigator.onLine) {
    console.error('[Sync] No se puede hacer hard reset sin conexión')
    return
  }
  
  isSyncing = true
  notifySyncListeners('syncing')
  
  try {
    // 1. Limpiar completamente las tablas locales
    await db.visitas.clear()
    await db.apicultores.clear()
    console.log('[Sync] Base de datos local limpiada')
    
    // 2. Traer TODOS los datos desde Supabase
    console.log('[Sync] Trayendo todos los datos desde servidor...')
    
    // Traer todas las visitas no eliminadas
    const { data: remoteVisitas, error: errVisitas } = await supabase
      .from('visitas')
      .select('*')
      .is('deleted_at', null)
    
    if (errVisitas) {
      console.error('[Sync] Error trayendo visitas:', errVisitas)
    } else if (remoteVisitas) {
      console.log(`[Sync] Recibidas ${remoteVisitas.length} visitas`)
      for (const remote of remoteVisitas) {
        await db.visitas.add({
          ...remote,
          sync_status: SYNC_STATUS.SYNCED
        })
      }
    }
    
    // Traer todos los apicultores no eliminados
    const { data: remoteApicultores, error: errApicultores } = await supabase
      .from('apicultores')
      .select('*')
      .is('deleted_at', null)
    
    if (errApicultores) {
      console.error('[Sync] Error trayendo apicultores:', errApicultores)
    } else if (remoteApicultores) {
      console.log(`[Sync] Recibidos ${remoteApicultores.length} apicultores`)
      for (const remote of remoteApicultores) {
        await db.apicultores.add({
          ...remote,
          sync_status: SYNC_STATUS.SYNCED
        })
      }
    }
    
    // 3. Resetear timestamps
    localStorage.setItem('last_sync_at', new Date().toISOString())
    localStorage.setItem('last_sync_apicultores', new Date().toISOString())
    localStorage.setItem('hard_reset_done', new Date().toISOString())
    
    console.log('[Sync] Hard reset completado exitosamente')
    notifySyncListeners('synced')
    
    // 4. Recargar la página para aplicar cambios
    window.location.reload()
    
  } catch (err) {
    console.error('[Sync] Error en hard reset:', err)
    notifySyncListeners('error')
  } finally {
    isSyncing = false
  }
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
