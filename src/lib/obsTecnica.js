import { supabase } from './supabase'

// Observaciones Apicultores para Visita Técnica.
// Dos categorías con nombres editables por el administrador.
export const CATEGORIAS = [
  {
    key: 'jriquelme',
    defaultLabel: 'Técnico J.Riquelme',
    claveConfig: 'obs_tecnica_label_jriquelme',
    permisoVer: 'puede_ver_observaciones_tecnico_jriquelme',
    permisoEditar: 'puede_editar_observaciones_tecnico_jriquelme',
  },
  {
    key: 'eburgos',
    defaultLabel: 'Técnico E.Burgos',
    claveConfig: 'obs_tecnica_label_eburgos',
    permisoVer: 'puede_ver_observaciones_tecnico_eburgos',
    permisoEditar: 'puede_editar_observaciones_tecnico_eburgos',
  },
]

const LS_KEY = 'obs_tecnica_labels'

function defaults() {
  const d = {}
  for (const c of CATEGORIAS) d[c.key] = c.defaultLabel
  return d
}

export function getCachedLabels() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    const out = defaults()
    for (const c of CATEGORIAS) {
      if (parsed[c.key]) out[c.key] = parsed[c.key]
    }
    return out
  } catch {
    return defaults()
  }
}

export async function fetchLabels() {
  const fallback = getCachedLabels()
  if (!supabase) return fallback
  try {
    const { data, error } = await supabase
      .from('configuracion')
      .select('clave, valor')
      .in('clave', CATEGORIAS.map(c => c.claveConfig))
    if (error) return fallback
    const out = { ...fallback }
    for (const row of data || []) {
      const cat = CATEGORIAS.find(c => c.claveConfig === row.clave)
      if (cat && row.valor) out[cat.key] = row.valor
    }
    localStorage.setItem(LS_KEY, JSON.stringify(out))
    return out
  } catch {
    return fallback
  }
}

export async function saveLabels(labels) {
  if (!supabase) throw new Error('Sin conexión a la base de datos')
  const rows = CATEGORIAS.map(c => ({ clave: c.claveConfig, valor: labels[c.key] || c.defaultLabel }))
  const { error } = await supabase.from('configuracion').upsert(rows, { onConflict: 'clave' })
  if (error) throw error
  localStorage.setItem(LS_KEY, JSON.stringify(labels))
  return labels
}

export function getObsTecnica(apicultor, key) {
  const o = apicultor?.observaciones_tecnica
  if (!o || typeof o !== 'object') return []
  return Array.isArray(o[key]) ? o[key] : []
}
