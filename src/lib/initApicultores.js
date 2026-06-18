import * as XLSX from 'xlsx'
import { db } from './db'
import { formatRUT, separarNombreApellido } from './importApicultores'

// URL del archivo Excel de apicultores (en public folder)
const EXCEL_URL = '/Planillas/Lista Usuarios PAP ASB y ABB.xlsx'

// Función para verificar si ya hay apicultores cargados
async function hayApicultoresCargados() {
  const count = await db.apicultores.count()
  return count > 0
}

// Función para importar apicultores desde el Excel en public
export async function initApicultores() {
  try {
    // Si ya hay apicultores, no hacer nada
    if (await hayApicultoresCargados()) {
      console.log('Apicultores ya cargados previamente')
      return { count: await db.apicultores.count(), imported: false }
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
        nombre_completo: nombreCompleto.toUpperCase(),
        nombres: nombres.toUpperCase(),
        apellidos: apellidos.toUpperCase(),
        rut,
        telefono: telefono.toString(),
        comuna: comuna.toString().toUpperCase(),
        direccion: direccion.toString().toUpperCase(),
        programa_indap: programaIndap.toString().toUpperCase(),
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
