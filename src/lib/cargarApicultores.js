// Función para cargar apicultores desde el Excel en public/Planillas
import * as XLSX from 'xlsx'
import { db, generateUUID, SYNC_STATUS } from './db'
import { formatRUT, separarNombreApellido } from './importApicultores'

const EXCEL_URL = '/Planillas/Lista%20Usuarios%20PAP%20ASB%20y%20ABB.xlsx'

export async function cargarApicultoresDesdeExcel() {
  try {
    const response = await fetch(EXCEL_URL)
    if (!response.ok) {
      throw new Error('No se pudo cargar el archivo Excel')
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    
    const dataRows = rows.slice(1)
    const apicultores = []
    const now = new Date().toISOString()
    
    for (const row of dataRows) {
      const nombreCompleto = row[1] || ''
      const rutRaw = row[2] || ''
      const telefono = row[3] || ''
      const comuna = row[4] || ''
      const direccion = row[5] || ''
      const programaIndap = row[6] || ''
      
      if (!nombreCompleto) continue
      
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
        sync_status: SYNC_STATUS.PENDING,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })
    }
    
    // Limpiar tabla existente y guardar nuevos datos
    await db.apicultores.clear()
    await db.apicultores.bulkAdd(apicultores)
    
    return { success: true, count: apicultores.length }
  } catch (err) {
    console.error('Error cargando apicultores:', err)
    return { success: false, error: err.message }
  }
}
