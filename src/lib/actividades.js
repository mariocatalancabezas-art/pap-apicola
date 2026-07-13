import { supabase } from './supabase'

// Devuelve las actividades cuya fecha es hoy o futura, ordenadas
// cronológicamente (la más próxima primero).
export async function listActividadesProximas() {
  if (!supabase) throw new Error('Supabase no está configurado')

  const hoy = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('actividades')
    .select('*')
    .gte('fecha', hoy)
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true, nullsFirst: true })

  if (error) throw new Error('Error al cargar actividades: ' + error.message)
  return data || []
}

export async function crearActividad({ actividad, fecha, hora, lugar }) {
  if (!supabase) throw new Error('Supabase no está configurado')

  const { data, error } = await supabase
    .from('actividades')
    .insert({
      actividad: actividad.trim(),
      fecha,
      hora: hora || null,
      lugar: lugar ? lugar.trim() : null,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error('Error al guardar la actividad: ' + error.message)
  return data
}

export async function editarActividad(id, { actividad, fecha, hora, lugar }) {
  if (!supabase) throw new Error('Supabase no está configurado')

  const { data, error } = await supabase
    .from('actividades')
    .update({
      actividad: actividad.trim(),
      fecha,
      hora: hora || null,
      lugar: lugar ? lugar.trim() : null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error('Error al actualizar la actividad: ' + error.message)
  return data
}

export async function eliminarActividad(id) {
  if (!supabase) throw new Error('Supabase no está configurado')

  const { error } = await supabase.from('actividades').delete().eq('id', id)
  if (error) throw new Error('Error al eliminar la actividad: ' + error.message)
}

// Convierte "HH:MM[:SS]" (24h) a formato 12h con AM/PM (ej: "2:30 PM").
export function formatHora12(hora) {
  if (!hora) return ''
  const [hhStr, mm] = hora.slice(0, 5).split(':')
  let h = Number(hhStr)
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${mm} ${ampm}`
}

// Formatea fecha (YYYY-MM-DD) + hora (HH:MM[:SS]) para mostrar al usuario.
export function formatActividadFecha(fecha, hora) {
  if (!fecha) return ''
  const [y, m, d] = fecha.split('-')
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d))
  const fechaTxt = dateObj.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  if (!hora) return fechaTxt
  return `${fechaTxt} · ${formatHora12(hora)}`
}
