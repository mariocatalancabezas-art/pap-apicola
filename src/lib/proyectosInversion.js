import { supabase } from './supabase'

export const BUCKET = 'proyectos-inversion'
export const MAX_APORTE_INDAP = 3500000
export const PORCENTAJE_MINIMO_APORTE = 30

// Deja sólo dígitos: "$ 1.200.000" → 1200000
export function parseMonto(valor) {
  if (typeof valor === 'number') return valor
  const digits = String(valor || '').replace(/\D/g, '')
  return digits ? Number(digits) : 0
}

// 1200000 → "1.200.000"
export function formatMiles(valor) {
  const n = parseMonto(valor)
  if (!n) return ''
  return n.toLocaleString('es-CL')
}

export function formatPesos(valor) {
  const n = parseMonto(valor)
  return '$ ' + n.toLocaleString('es-CL')
}

// Porcentaje que representa el aporte del usuario (propio + crédito + valorizado) sobre el aporte Indap.
export function porcentajeAporte({ montoIndap, montoPropio, montoCredito, montoValorizado }) {
  const indap = parseMonto(montoIndap)
  if (!indap) return 0
  const aporte = parseMonto(montoPropio) + parseMonto(montoCredito) + parseMonto(montoValorizado)
  return (aporte / indap) * 100
}

export async function listProyectos() {
  if (!supabase) throw new Error('Supabase no está configurado')

  const { data, error } = await supabase
    .from('proyectos_inversion')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error('Error al cargar los proyectos: ' + error.message)
  return data || []
}

export async function getProyecto(id) {
  if (!supabase) throw new Error('Supabase no está configurado')

  const { data, error } = await supabase
    .from('proyectos_inversion')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error('Error al cargar el proyecto: ' + error.message)
  return data
}

function toRow(form) {
  const montoIndap = parseMonto(form.monto_indap)
  const montoPropio = parseMonto(form.monto_propio)
  const montoCredito = form.solicita_credito ? parseMonto(form.monto_credito) : 0
  const montoValorizado = form.aporte_valorizado ? parseMonto(form.monto_valorizado) : 0
  return {
    apicultor_nombre: (form.apicultor_nombre || '').trim(),
    apicultor_rut: form.apicultor_rut || null,
    apicultor_telefono: form.apicultor_telefono || null,
    apicultor_email: form.apicultor_email || null,
    apicultor_comuna: form.apicultor_comuna || null,
    apicultor_direccion: form.apicultor_direccion || null,
    nombre_proyecto: (form.nombre_proyecto || '').trim(),
    detalle_proyecto: form.detalle_proyecto || null,
    monto_indap: montoIndap,
    monto_propio: montoPropio,
    aporte_valorizado: !!form.aporte_valorizado,
    monto_valorizado: montoValorizado,
    solicita_credito: !!form.solicita_credito,
    monto_credito: montoCredito,
    monto_total: montoIndap + montoPropio + montoCredito + montoValorizado,
  }
}

export async function crearProyecto(form, creadoPor) {
  if (!supabase) throw new Error('Supabase no está configurado')

  const { data, error } = await supabase
    .from('proyectos_inversion')
    .insert({ ...toRow(form), created_by: creadoPor || null })
    .select()
    .single()

  if (error) throw new Error('Error al guardar el proyecto: ' + error.message)
  return data
}

export async function editarProyecto(id, form) {
  if (!supabase) throw new Error('Supabase no está configurado')

  const { data, error } = await supabase
    .from('proyectos_inversion')
    .update({ ...toRow(form), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error('Error al actualizar el proyecto: ' + error.message)
  return data
}

export async function eliminarProyecto(id) {
  if (!supabase) throw new Error('Supabase no está configurado')

  const archivos = await listArchivos(id)
  if (archivos.length > 0) {
    await supabase.storage.from(BUCKET).remove(archivos.map(a => a.path))
  }

  const { error } = await supabase.from('proyectos_inversion').delete().eq('id', id)
  if (error) throw new Error('Error al eliminar el proyecto: ' + error.message)
}

export async function listArchivos(proyectoId) {
  if (!supabase) throw new Error('Supabase no está configurado')

  const { data, error } = await supabase
    .from('proyectos_inversion_archivos')
    .select('*')
    .eq('proyecto_id', proyectoId)
    .order('created_at', { ascending: true })

  if (error) throw new Error('Error al cargar los archivos: ' + error.message)
  return data || []
}

function nombreSeguro(nombre) {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function subirArchivo(proyectoId, file, tipo) {
  if (!supabase) throw new Error('Supabase no está configurado')

  const path = `${proyectoId}/${tipo}/${Date.now()}_${nombreSeguro(file.name || 'archivo')}`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })

  if (uploadError) throw new Error('Error al subir el archivo: ' + uploadError.message)

  const { data, error } = await supabase
    .from('proyectos_inversion_archivos')
    .insert({
      proyecto_id: proyectoId,
      tipo,
      nombre: file.name || 'archivo',
      path,
      mime_type: file.type || null,
      tamano: file.size || null,
    })
    .select()
    .single()

  if (error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw new Error('Error al registrar el archivo: ' + error.message)
  }
  return data
}

export async function eliminarArchivo(archivo) {
  if (!supabase) throw new Error('Supabase no está configurado')

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([archivo.path])
  if (storageError) throw new Error('Error al eliminar el archivo: ' + storageError.message)

  const { error } = await supabase
    .from('proyectos_inversion_archivos')
    .delete()
    .eq('id', archivo.id)

  if (error) throw new Error('Error al eliminar el registro del archivo: ' + error.message)
}

export async function descargarArchivo(archivo) {
  if (!supabase) throw new Error('Supabase no está configurado')

  const { data, error } = await supabase.storage.from(BUCKET).download(archivo.path)
  if (error) throw new Error('Error al descargar el archivo: ' + error.message)

  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = archivo.nombre || 'archivo'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function urlArchivo(archivo) {
  if (!supabase) throw new Error('Supabase no está configurado')

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(archivo.path, 60 * 60)

  if (error) throw new Error('Error al obtener el archivo: ' + error.message)
  return data.signedUrl
}
