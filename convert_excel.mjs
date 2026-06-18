import * as XLSX from 'xlsx'
import { formatRUT, separarNombreApellido } from './src/lib/importApicultores.js'

const workbook = XLSX.readFile('public/Planillas/Lista Usuarios PAP ASB y ABB.xlsx')
const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

const dataRows = rows.slice(1)
const apicultores = []

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

console.log(`export const APICULTORES_DATA = ${JSON.stringify(apicultores, null, 2)}`)
console.log(`\n// Total: ${apicultores.length} apicultores`)
