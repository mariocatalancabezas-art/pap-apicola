import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const PDF_MARGEN_MM = 14

const PDF_LETTER_ANCHOS_MM = {
  portrait: 215.9,
  landscape: 279.4,
}

export function obtenerAnchoUtilPDF(orientation = 'landscape') {
  const anchoPagina = PDF_LETTER_ANCHOS_MM[orientation] || PDF_LETTER_ANCHOS_MM.landscape
  return anchoPagina - PDF_MARGEN_MM * 2
}

export function calcularAnchosColumnasPDF({
  cantidadConfigurables,
  orientation = 'landscape',
  anchoNumero = 10,
  anchoNombre = 48,
  anchoMinimoConfigurable = 12,
}) {
  const anchoConfigurable = Math.max(
    0,
    obtenerAnchoUtilPDF(orientation) - anchoNumero - anchoNombre,
  )
  const anchoPorColumna = cantidadConfigurables > 0
    ? anchoConfigurable / cantidadConfigurables
    : 0
  const anchoAplicado = cantidadConfigurables > 0
    ? Math.max(anchoMinimoConfigurable, anchoPorColumna)
    : 0

  return {
    0: { cellWidth: anchoNumero },
    1: { cellWidth: anchoNombre },
    ...Object.fromEntries(
      Array.from({ length: cantidadConfigurables }, (_, index) => [
        index + 2,
        { cellWidth: anchoAplicado },
      ]),
    ),
  }
}

function slugify(texto) {
  return texto
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function fechaHoy() {
  const hoy = new Date()
  const dia = String(hoy.getDate()).padStart(2, '0')
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const anio = hoy.getFullYear()
  return `${dia}-${mes}-${anio}`
}

export function exportarPDF({
  titulo,
  subtitulos = [],
  columnas,
  filas,
  nombreArchivo,
  columnStyles = {},
  rowHeight,
  orientation = 'landscape',
  horizontalPageBreak = false,
  horizontalPageBreakRepeat = null,
  rowPageBreak = 'auto',
}) {
  const nombreBase = nombreArchivo || `${slugify(titulo)}-${fechaHoy()}.pdf`
  const nombreFinal = nombreBase.endsWith('.pdf') ? nombreBase : `${nombreBase}.pdf`
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'letter',
  })

  const margen = PDF_MARGEN_MM
  let y = 14

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(titulo.toUpperCase(), doc.internal.pageSize.getWidth() / 2, y, { align: 'center' })
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  subtitulos.forEach(s => {
    doc.text(`${s.label}: ${s.valor || '____________________________'}`, margen, y)
    y += 6
  })

  y += 8

  autoTable(doc, {
    startY: y,
    head: [columnas],
    body: filas,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2, font: 'helvetica' },
    bodyStyles: rowHeight ? { minCellHeight: rowHeight } : undefined,
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    columnStyles,
    margin: { left: margen, right: margen },
    ...(horizontalPageBreak
      ? { horizontalPageBreak: true, horizontalPageBreakRepeat }
      : {}),
    rowPageBreak,
  })

  doc.save(nombreFinal)
}

export async function compartirPDF(blob, titulo, nombreArchivo = 'planilla.pdf') {
  const file = new File([blob], nombreArchivo, { type: 'application/pdf' })
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ title: titulo || file.name, files: [file] })
      return true
    } catch (err) {
      if (err.name === 'AbortError') return true
      console.error('Share error:', err)
      return false
    }
  }
  return false
}

export async function generarPDFBlob({
  titulo,
  subtitulos = [],
  columnas,
  filas,
  nombreArchivo,
  columnStyles = {},
  rowHeight,
  orientation = 'landscape',
  horizontalPageBreak = false,
  horizontalPageBreakRepeat = null,
  rowPageBreak = 'auto',
}) {
  const nombreBase = nombreArchivo || `${slugify(titulo)}-${fechaHoy()}.pdf`
  const nombreFinal = nombreBase.endsWith('.pdf') ? nombreBase : `${nombreBase}.pdf`
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'letter',
  })

  const margen = PDF_MARGEN_MM
  let y = 14

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(titulo.toUpperCase(), doc.internal.pageSize.getWidth() / 2, y, { align: 'center' })
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  subtitulos.forEach(s => {
    doc.text(`${s.label}: ${s.valor || '____________________________'}`, margen, y)
    y += 6
  })

  y += 8

  autoTable(doc, {
    startY: y,
    head: [columnas],
    body: filas,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2, font: 'helvetica' },
    bodyStyles: rowHeight ? { minCellHeight: rowHeight } : undefined,
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    columnStyles,
    margin: { left: margen, right: margen },
    ...(horizontalPageBreak
      ? { horizontalPageBreak: true, horizontalPageBreakRepeat }
      : {}),
    rowPageBreak,
  })

  return { blob: doc.output('blob'), nombreFinal }
}
