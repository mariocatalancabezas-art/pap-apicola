import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { PDF_MARGEN_MM } from './planillaPdf'
import { DOCUMENTACION_REQUERIDA } from './proyectoInforme'

const ETIQUETAS_ADJUNTOS = {
  cotizacion: 'Cotizaciones',
  fotografia: 'Fotografías',
  ...Object.fromEntries(DOCUMENTACION_REQUERIDA.map(item => [item.tipo, item.label])),
}

function agregarPares(doc, seccion, margen, y, anchoUtil) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(seccion.titulo, margen, y)
  y += 7
  doc.setFontSize(10)
  seccion.items.forEach(item => {
    const lineas = doc.splitTextToSize(`${item.label}: ${item.valor}`, anchoUtil)
    if (y + lineas.length * 5 > doc.internal.pageSize.getHeight() - PDF_MARGEN_MM) {
      doc.addPage()
      y = PDF_MARGEN_MM
    }
    doc.setFont('helvetica', 'normal')
    doc.text(lineas, margen, y)
    y += lineas.length * 5
  })
  return y + 5
}

function slugTexto(texto) {
  return String(texto || 'apicultor')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'apicultor'
}

function fechaHoy() {
  const hoy = new Date()
  return `${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${hoy.getFullYear()}`
}

export async function exportarInformePDF(datos, nombreArchivo) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  })
  const margen = PDF_MARGEN_MM
  const anchoUtil = doc.internal.pageSize.getWidth() - margen * 2
  const altoUtil = doc.internal.pageSize.getHeight() - margen
  let y = margen

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(datos.titulo, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' })
  y += 12

  y = agregarPares(doc, { titulo: 'Datos del Apicultor', items: datos.datosApicultor }, margen, y, anchoUtil)
  y = agregarPares(doc, { titulo: 'Proyecto de Inversión', items: datos.proyecto }, margen, y, anchoUtil)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Montos', margen, y)
  y += 4
  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Monto']],
    body: datos.montos.map(item => [item.concepto, item.monto]),
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2, font: 'helvetica' },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
    margin: { left: margen, right: margen },
  })
  y = (doc.lastAutoTable?.finalY || y + 10) + 7

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  if (y > altoUtil - 10) {
    doc.addPage()
    y = margen
  }
  doc.text('Informe Técnico del Proyecto', margen, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  datos.informeTecnico.forEach(parrafo => {
    const lineas = doc.splitTextToSize(parrafo, anchoUtil)
    if (y + lineas.length * 5 > altoUtil) {
      doc.addPage()
      y = margen
    }
    doc.text(lineas, margen, y)
    y += lineas.length * 5 + 4
  })

  if (datos.notaValorizado) {
    const lineas = doc.splitTextToSize(datos.notaValorizado, anchoUtil)
    if (y + lineas.length * 5 > altoUtil) {
      doc.addPage()
      y = margen
    }
    doc.setFont('helvetica', 'bold')
    doc.text(lineas, margen, y)
    y += lineas.length * 5 + 5
  }

  const adjuntos = datos.adjuntos || []
  if (adjuntos.length > 0) {
    if (y > altoUtil - 20) {
      doc.addPage()
      y = margen
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Archivos adjuntos', margen, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const grupos = adjuntos.reduce((resultado, archivo) => {
      const tipo = archivo.tipo || 'otros'
      if (!resultado[tipo]) resultado[tipo] = []
      resultado[tipo].push(archivo)
      return resultado
    }, {})
    Object.entries(grupos).forEach(([tipo, archivos]) => {
      if (y > altoUtil - 10) {
        doc.addPage()
        y = margen
      }
      doc.setFont('helvetica', 'bold')
      doc.text(ETIQUETAS_ADJUNTOS[tipo] || tipo, margen, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      archivos.forEach(archivo => {
        if (y > altoUtil - 5) {
          doc.addPage()
          y = margen
        }
        doc.text(`• ${archivo.nombre || 'archivo'}`, margen + 3, y)
        y += 5
      })
    })
  }

  const nombre = nombreArchivo
    || `informe-tecnico-${slugTexto(datos.datosApicultor?.[0]?.valor)}-${fechaHoy()}.pdf`
  doc.save(nombre.endsWith('.pdf') ? nombre : `${nombre}.pdf`)
}
