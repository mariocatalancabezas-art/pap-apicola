import { db, SYNC_STATUS, generateUUID } from './db'

// NOTA: El import desde Excel fue eliminado. Los apicultores se mantienen
// exclusivamente en Supabase y se sincronizan en todos los dispositivos.

// Migración: los apicultores importados previamente desde Excel quedaron como
// SYNCED aunque no estuvieran en Supabase. Esta función los marca como PENDING
// una sola vez para que se sincronicen a Supabase y estén disponibles en todos
// los dispositivos.
async function migrarApicultoresSincronizados() {
  const MIGRATION_KEY = 'migracion_apicultores_synced_a_pending'
  if (localStorage.getItem(MIGRATION_KEY)) return

  const apicultores = await db.apicultores.toArray()
  const paraMigrar = apicultores.filter(a => a.sync_status === SYNC_STATUS.SYNCED && !a.deleted_at)
  if (paraMigrar.length > 0) {
    console.log(`[Migración] Marcando ${paraMigrar.length} apicultores como PENDING para sincronizar a Supabase`)
    for (const a of paraMigrar) {
      await db.apicultores.update(a.id, { sync_status: SYNC_STATUS.PENDING })
    }
  }
  localStorage.setItem(MIGRATION_KEY, new Date().toISOString())
}

// Elimina apicultores duplicados en la base de datos local, conservando
// una sola fila por nombre_completo (prefiere las no eliminadas y el id más bajo).
export async function dedupeApicultoresLocal() {
  const all = await db.apicultores.toArray()
  all.sort((a, b) => {
    const da = a.deleted_at ? 1 : 0
    const dbb = b.deleted_at ? 1 : 0
    if (da !== dbb) return da - dbb
    return (a.id || 0) - (b.id || 0)
  })
  const seen = new Set()
  const toDelete = []
  for (const a of all) {
    const key = (a.nombre_completo || '').trim().toUpperCase()
    if (!key) continue
    if (seen.has(key)) {
      toDelete.push(a.id)
    } else {
      seen.add(key)
    }
  }
  if (toDelete.length > 0) {
    await db.apicultores.bulkDelete(toDelete)
    console.log(`[Dedupe] Eliminados ${toDelete.length} apicultores duplicados localmente`)
  }
  return toDelete.length
}

// Crea apicultores faltantes a partir de diagnósticos existentes. Útil cuando
// un productor fue registrado en una visita pero aún no existe en la lista de
// apicultores (por ejemplo Javier Sanhueza).
export async function seedApicultoresFromVisitas() {
  const visitas = await db.visitas.toArray()
  const apicultores = await db.apicultores.toArray()
  const existingNames = new Set(apicultores.map(a => (a.nombre_completo || '').trim().toUpperCase()))
  const existingRuts = new Set(apicultores.map(a => (a.rut || '').trim().toUpperCase()))
  const now = new Date().toISOString()
  let added = 0

  for (const v of visitas) {
    const nombres = (v.f1_nombre || '').trim().toUpperCase()
    const apellidos = (v.f2_apellido || '').trim().toUpperCase()
    const nombre_completo = `${nombres} ${apellidos}`.trim()
    const rut = (v.f3_rut || '').trim().toUpperCase()
    if (!nombre_completo) continue

    const alreadyExists = existingNames.has(nombre_completo) || (rut && existingRuts.has(rut))
    if (alreadyExists) continue

    const nuevo = {
      uuid: generateUUID(),
      nombres,
      apellidos,
      nombre_completo,
      rut,
      telefono: (v.f4_telefono || '').trim(),
      comuna: (v.f7_comuna || '').trim().toUpperCase(),
      direccion: (v.f9_dir_propiedad || '').trim().toUpperCase(),
      programa_indap: (v.f18_programa_indap || '').trim().toUpperCase(),
      sync_status: SYNC_STATUS.PENDING,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }
    await db.apicultores.add(nuevo)
    existingNames.add(nombre_completo)
    if (rut) existingRuts.add(rut)
    added++
  }

  if (added > 0) {
    console.log(`[Apicultores] Creados ${added} apicultores desde diagnósticos existentes`)
  }
  return added
}

// Ya no importa desde Excel. Solo retorna la cantidad actual mientras la
// sincronización normal trae los datos desde Supabase.
export async function initApicultores() {
  await migrarApicultoresSincronizados()
  await seedApicultoresFromVisitas()
  const count = await db.apicultores.count()
  console.log(`[Apicultores] initApicultores: ${count} apicultores locales. Sincronización desde Supabase.`)
  return { count, imported: false }
}
