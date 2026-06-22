import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

export function exportarPDF({ titulo, subtitulos = [], columnas, filas, nombreArchivo }) {
  const nombreBase = nombreArchivo || `${slugify(titulo)}-${fechaHoy()}.pdf`
  const nombreFinal = nombreBase.endsWith('.pdf') ? nombreBase : `${nombreBase}.pdf`
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter',
  })

  const margen = 14
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

  y += 4

  autoTable(doc, {
    startY: y,
    head: [columnas],
    body: filas,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2, font: 'helvetica' },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    margin: { left: margen, right: margen },
  })

  doc.save(nombreFinal)
}

export async function compartirPDF(blob, titulo, nombreArchivo = 'planilla.pdf') {
  const file = new File([blob], nombreArchivo, { type: 'application/pdf' })
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ title, files: [file] })
      return true
    } catch (err) {
      if (err.name === 'AbortError') return true
      console.error('Share error:', err)
      return false
    }
  }
  return false
}

export async function generarPDFBlob({ titulo, subtitulos = [], columnas, filas, nombreArchivo }) {
  const nombreBase = nombreArchivo || `${slugify(titulo)}-${fechaHoy()}.pdf`
  const nombreFinal = nombreBase.endsWith('.pdf') ? nombreBase : `${nombreBase}.pdf`
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter',
  })

  const margen = 14
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

  y += 4

  autoTable(doc, {
    startY: y,
    head: [columnas],
    body: filas,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2, font: 'helvetica' },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    margin: { left: margen, right: margen },
  })

  return { blob: doc.output('blob'), nombreFinal }
}
