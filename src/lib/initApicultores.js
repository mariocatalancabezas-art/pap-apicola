import * as XLSX from 'xlsx'
import { db, generateUUID, SYNC_STATUS } from './db'
import { formatRUT, separarNombreApellido } from './importApicultores'
import { supabase } from './supabase'

// URL del archivo Excel de apicultores (en public folder)
const EXCEL_URL = '/Planillas/Lista%20Usuarios%20PAP%20ASB%20y%20ABB.xlsx'

// Función para verificar si ya hay apicultores cargados localmente
async function hayApicultoresCargados() {
  const count = await db.apicultores.count()
  return count > 0
}

// Verifica si Supabase ya tiene apicultores (para no re-importar el Excel
// en cada dispositivo y así evitar duplicados).
async function supabaseTieneApicultores() {
  if (!supabase) return false
  try {
    const { count, error } = await supabase
      .from('apicultores')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
    if (error) return false
    return (count || 0) > 0
  } catch {
    return false
  }
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

// Función para importar apicultores desde el Excel en public
export async function initApicultores() {
  try {
    // Si ya hay apicultores locales, no hacer nada
    if (await hayApicultoresCargados()) {
      console.log('Apicultores ya cargados previamente')
      return { count: await db.apicultores.count(), imported: false }
    }

    // Si Supabase ya tiene apicultores, NO importar el Excel: la sincronización
    // los traerá. Esto evita crear duplicados al instalar la app en un nuevo
    // dispositivo o navegador.
    if (await supabaseTieneApicultores()) {
      console.log('Supabase ya tiene apicultores; se omite la importación del Excel')
      return { count: 0, imported: false }
    }

    // Cargar el archivo Excel
    const response = await fetch(EXCEL_URL)
    if (!response.ok) {
      console.log('Archivo Excel de apicultores no encontrado')
      return { count: 0, imported: false }
    }

    const arrayBuffer = await response.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    
    // Saltar la primera fila (encabezados)
    const dataRows = rows.slice(1)
    
    const apicultores = []
    const now = new Date().toISOString()
    
    for (const row of dataRows) {
      // Columnas: B=nombre, C=rut, D=telefono, E=comuna, F=direccion, G=asesoria_base
      const nombreCompleto = row[1] || '' // Columna B
      const rutRaw = row[2] || '' // Columna C
      const telefono = row[3] || '' // Columna D
      const comuna = row[4] || '' // Columna E
      const direccion = row[5] || '' // Columna F
      const programaIndap = row[6] || '' // Columna G
      
      if (!nombreCompleto) continue // Saltar filas vacías
      
      const { nombres, apellidos } = separarNombreApellido(nombreCompleto)
      const rut = formatRUT(rutRaw)
      
      apicultores.push({
        uuid: generateUUID(),
        nombre_completo: nombreCompleto.toUpperCase(),
        nombres: nombres.toUpperCase(),
        apellidos: apellidos.toUpperCase(),
        rut,
        telefono: telefono.toString(),
        comuna: comuna.toString().toUpperCase(),
        direccion: direccion.toString().toUpperCase(),
        programa_indap: programaIndap.toString().toUpperCase(),
        sync_status: SYNC_STATUS.SYNCED, // Inicialmente synched ya que vienen del Excel oficial
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })
    }
    
    // Guardar en la base de datos local
    if (apicultores.length > 0) {
      await db.apicultores.bulkAdd(apicultores)
      console.log(`✓ ${apicultores.length} apicultores importados automáticamente`)
    }
    
    return { count: apicultores.length, imported: true }
  } catch (err) {
    console.error('Error importando apicultores:', err)
    return { count: 0, imported: false, error: err.message }
  }
}
