import * as XLSX from 'xlsx'
import { db } from './db'

// Función para formatear RUT (agregar puntos)
export function formatRUT(rut) {
  if (!rut) return ''
  // Limpiar el RUT
  let clean = rut.toString().replace(/[^0-9kK\-]/g, '').toUpperCase()
  
  // Si ya tiene formato completo, devolverlo
  if (clean.includes('.') || clean.length < 8) return clean
  
  // Separar número y dígito verificador
  const parts = clean.split('-')
  if (parts.length !== 2) return clean
  
  let numero = parts[0]
  const dv = parts[1]
  
  // Agregar puntos
  numero = numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  
  return `${numero}-${dv}`
}

// Función para separar nombre y apellidos
export function separarNombreApellido(nombreCompleto) {
  if (!nombreCompleto) return { nombres: '', apellidos: '' }
  
  const partes = nombreCompleto.trim().split(/\s+/)
  
  if (partes.length === 1) {
    return { nombres: partes[0], apellidos: '' }
  } else if (partes.length === 2) {
    return { nombres: partes[0], apellidos: partes[1] }
  } else {
    // Asumir que los últimos 2 son apellidos, el resto son nombres
    const apellidos = partes.slice(-2).join(' ')
    const nombres = partes.slice(0, -2).join(' ')
    return { nombres, apellidos }
  }
}

// Función para importar Excel
export async function importarApicultoresExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
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
        
        // Limpiar tabla existente y guardar nuevos datos
        await db.apicultores.clear()
        await db.apicultores.bulkAdd(apicultores)
        
        resolve({ count: apicultores.length })
      } catch (err) {
        reject(err)
      }
    }
    
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsArrayBuffer(file)
  })
}

// Función para buscar apicultores por nombre (mínimo 4 caracteres)
export async function buscarApicultoresPorNombre(query) {
  if (!query || query.length < 4) return []

  const searchTerm = query.toUpperCase().trim()

  // Buscar en nombre_completo, nombres o apellidos
  const all = await db.apicultores.toArray()

  const filtered = all.filter(a => {
    const nombreCompleto = (a.nombre_completo || '').toUpperCase()
    const nombres = (a.nombres || '').toUpperCase()
    const apellidos = (a.apellidos || '').toUpperCase()

    return nombreCompleto.includes(searchTerm) ||
           nombres.includes(searchTerm) ||
           apellidos.includes(searchTerm)
  })

  // Deduplicar por nombre_completo para evitar mostrar el mismo apicultor múltiples veces
  const seenNames = new Set()
  const finalResults = []
  for (const a of filtered) {
    const nombreKey = (a.nombre_completo || '').toUpperCase().trim()
    if (!seenNames.has(nombreKey)) {
      seenNames.add(nombreKey)
      finalResults.push(a)
    }
  }

  return finalResults.slice(0, 10) // Máximo 10 resultados
}

// Función para buscar miembros del equipo técnico por nombre (mínimo 3 caracteres)
export async function buscarEquipoTecnicoPorNombre(query) {
  if (!query || query.length < 3) return []

  const searchTerm = query.toUpperCase().trim()

  const all = await db.equipo_tecnico.toArray()

  const filtered = all.filter(m => {
    if (m.deleted_at) return false
    const nombreCompleto = (m.nombre_completo || '').toUpperCase()
    const nombres = (m.nombres || '').toUpperCase()
    const apellidos = (m.apellidos || '').toUpperCase()

    return nombreCompleto.includes(searchTerm) ||
           nombres.includes(searchTerm) ||
           apellidos.includes(searchTerm)
  })

  const seenNames = new Set()
  const finalResults = []
  for (const m of filtered) {
    const nombreKey = (m.nombre_completo || `${m.nombres || ''} ${m.apellidos || ''}`).toUpperCase().trim()
    if (!seenNames.has(nombreKey)) {
      seenNames.add(nombreKey)
      finalResults.push(m)
    }
  }

  return finalResults.slice(0, 10)
}
