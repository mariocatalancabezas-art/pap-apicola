import { db, SYNC_STATUS, generateUUID } from './db'
import { supabase } from './supabase'

const BUCKET = 'visitas-fotos'

function nombreSeguro(nombre) {
  return String(nombre || 'fotografia')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
}

function ordenFotos(a, b) {
  return String(a.created_at || '').localeCompare(String(b.created_at || ''))
}

async function agregarRemotas(visitaUuid) {
  if (!supabase || !navigator.onLine) return
  const { data, error } = await supabase
    .from('visita_fotos')
    .select('*')
    .eq('visita_uuid', visitaUuid)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('[Fotos] Error al traer fotografías remotas:', error)
    return
  }
  for (const remote of data || []) {
    const existing = await db.visita_fotos.where('uuid').equals(remote.uuid).first()
    if (!existing) {
      await db.visita_fotos.add({
        ...remote,
        id: undefined,
        blob: null,
        sync_status: SYNC_STATUS.SYNCED,
      })
    } else if (
      existing.sync_status !== SYNC_STATUS.PENDING
      && new Date(remote.updated_at || remote.created_at || 0) > new Date(existing.updated_at || existing.created_at || 0)
    ) {
      await db.visita_fotos.update(existing.id, {
        ...remote,
        id: existing.id,
        blob: existing.blob || null,
        sync_status: SYNC_STATUS.SYNCED,
      })
    }
  }
}

export async function listFotosVisita(visitaUuid) {
  if (!visitaUuid) return []
  try {
    await agregarRemotas(visitaUuid)
  } catch (error) {
    console.error('[Fotos] Error al sincronizar fotografías remotas:', error)
  }
  const fotos = await db.visita_fotos
    .where('visita_uuid')
    .equals(visitaUuid)
    .filter(foto => !foto.deleted_at)
    .toArray()
  fotos.sort(ordenFotos)
  if (supabase && navigator.onLine) {
    await Promise.all(fotos.map(async foto => {
      if (foto.blob || !foto.path) return
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(foto.path, 60 * 60)
      if (!error && data?.signedUrl) foto.preview_url = data.signedUrl
    }))
  }
  return fotos
}

export async function addFotoVisita(visitaUuid, file) {
  if (!visitaUuid) throw new Error('Guarda la visita para poder adjuntar fotografías')
  if (!file?.type?.startsWith('image/')) throw new Error('Sólo se pueden adjuntar imágenes')
  const activas = await db.visita_fotos
    .where('visita_uuid')
    .equals(visitaUuid)
    .filter(foto => !foto.deleted_at)
    .count()
  if (activas >= 5) throw new Error('Máximo 5 fotografías por visita')
  const now = new Date().toISOString()
  return db.visita_fotos.add({
    uuid: generateUUID(),
    visita_uuid: visitaUuid,
    nombre: file.name || `fotografia_${Date.now()}.jpg`,
    mime_type: file.type || 'image/jpeg',
    tamano: file.size || 0,
    blob: file,
    sync_status: SYNC_STATUS.PENDING,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  })
}

export async function deleteFotoVisita(uuid) {
  const foto = await db.visita_fotos.where('uuid').equals(uuid).first()
  if (!foto) return
  await db.visita_fotos.update(foto.id, {
    deleted_at: new Date().toISOString(),
    sync_status: SYNC_STATUS.PENDING,
    updated_at: new Date().toISOString(),
  })
}

export async function obtenerArchivoFotoVisita(foto) {
  let blob = foto?.blob
  if (!blob && foto?.path && supabase) {
    const { data, error } = await supabase.storage.from(BUCKET).download(foto.path)
    if (error) throw new Error(`Error al descargar fotografía: ${error.message}`)
    blob = data
  }
  if (!blob) throw new Error('La fotografía no está disponible')
  return new File([blob], foto.nombre || 'fotografia', {
    type: foto.mime_type || blob.type || 'image/jpeg',
  })
}

export async function descargarFotoVisita(foto) {
  const archivo = await obtenerArchivoFotoVisita(foto)
  const url = URL.createObjectURL(archivo)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = archivo.name
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export { BUCKET as VISITAS_FOTOS_BUCKET, nombreSeguro }
