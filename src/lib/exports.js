import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx-js-style'

const AMBER = [245, 158, 11]
const AMBER_LIGHT = [255, 251, 235]
const PURPLE = [109, 40, 217]
const PURPLE_LIGHT = [245, 243, 255]
const GRAY_DARK = [55, 65, 81]
const GRAY_MID = [107, 114, 128]
const WHITE = [255, 255, 255]
const AMBER_DARK = [180, 83, 9]

function v(val) { return val || '' }
function n(val) { return val !== '' && val !== undefined && val !== null ? val : '' }
const ENCUESTA_LABELS = { '0': 'Fue encuestado', '1': 'No entrega información', '2': 'No estuvo ubicable', '3': 'No posee información', '4': 'Renunció al programa', '5': 'Otro' }
function vEncuesta(val) { return ENCUESTA_LABELS[String(val)] || v(val) }
function fmtMoney(val) {
  const num = parseFloat(val)
  if (isNaN(num)) return ''
  return '$' + num.toLocaleString('es-CL')
}

// ── Helpers PDF ──────────────────────────────────────────────────────────────
function addHeader(doc, visita, pageNum, totalPages) {
  const W = 216, M = 15
  doc.setFillColor(...AMBER)
  doc.rect(0, 0, W, 23, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('PAP Apícola Santa Bárbara-Indap — Diagnóstico de Negocio', M, 11)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Diagnóstico N° ${v(visita.f20_numero_encuesta)}  |  Fecha: ${v(visita.f19_fecha_encuesta)}  |  Pág. ${pageNum} / ${totalPages}`, M, 20)

  doc.setTextColor(...GRAY_DARK)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
}

function sectionHeader(doc, y, letter, title, color = AMBER) {
  doc.setFillColor(...color)
  doc.rect(15, y, 6, 6, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text(letter, 18, y + 4.5, { align: 'center' })
  doc.setTextColor(...GRAY_DARK)
  doc.setFontSize(9)
  doc.text(title.toUpperCase(), 23, y + 4.5)
  doc.setDrawColor(...color)
  doc.line(23, y + 6.2, 200, y + 6.2)
  return y + 10
}

function twoCol(doc, y, label1, val1, label2, val2) {
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY_MID)
  doc.text(label1 + ':', 15, y)
  doc.text(label2 + ':', 110, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY_DARK)
  doc.text(String(v(val1)), 15, y + 4.5)
  doc.text(String(v(val2)), 110, y + 4.5)
  return y + 9
}

function oneCol(doc, y, label, val) {
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY_MID)
  doc.text(label + ':', 15, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY_DARK)
  const lines = doc.splitTextToSize(String(v(val)), 185)
  doc.text(lines, 15, y + 4.5)
  return y + 4.5 + lines.length * 4.5 + 2
}

// ── PDF INDIVIDUAL POR VISITA (carta, 216×279mm) ──────────────────────────────
export function generateVisitaPDF(visita, variant = 'encuesta') {
  const esEncuesta = variant === 'encuesta'
  const labelNumero = esEncuesta ? '20. N° Encuesta' : '20. N° Diagnóstico'
  const labelFecha = esEncuesta ? '19. Fecha Encuesta' : '19. Fecha Diagnóstico'
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const W = 216, M = 15
  let y = 27

  addHeader(doc, visita, 1, 3)

  // ─ SECCIÓN A ─────────────────────────────────────────────────────────────
  y = sectionHeader(doc, y, 'A', 'Antecedentes Generales')
  y = twoCol(doc, y, '1. Nombre', visita.f1_nombre, '2. Apellido', visita.f2_apellido)
  y = twoCol(doc, y, '3. RUT', visita.f3_rut, '4. Teléfono', visita.f4_telefono)
  y = twoCol(doc, y, '5. Email', visita.f5_email, '11. Fecha Nacimiento', visita.f11_fecha_nacimiento)
  y = twoCol(doc, y, '6. Región', visita.f6_region, '7. Comuna', visita.f7_comuna)
  y = twoCol(doc, y, '8. Área INDAP', visita.f8_area_indap, '18. Programa INDAP', visita.f18_programa_indap)
  y = oneCol(doc, y, '9. Dirección Propiedad', visita.f9_dir_propiedad)
  y = oneCol(doc, y, '10. Dirección Predio Principal', visita.f10_dir_predio)
  y = twoCol(doc, y, '12. Género', visita.f12_genero, '13. Pueblo Originario', visita.f13_pueblo_originario)
  y = twoCol(doc, y, '14. Nivel Educacional', visita.f14_nivel_educacional, labelNumero, visita.f20_numero_encuesta)
  y = twoCol(doc, y, '15. Poder Comprador', visita.f15_poder_comprador, '16. Rubro/Negocio', visita.f16_rubro_negocio)
  y = twoCol(doc, y, '17. Unidad Operativa', visita.f17_unidad_operativa, labelFecha, visita.f19_fecha_encuesta)

  y += 4
  // ─ SECCIÓN B ─────────────────────────────────────────────────────────────
  if (y > 230) { doc.addPage(); addHeader(doc, visita, 2, 3); y = 27 }
  y = sectionHeader(doc, y, 'B', 'Formalización del Negocio')
  y = twoCol(doc, y, '21. Iniciación Actividades', visita.f21_iniciacion_actividades, '22. Tributación', visita.f22_tipo_tributacion)
  y = oneCol(doc, y, '23. Habilitado para comercializar al Poder Comprador', visita.f23_habilitado_poder_comprador)

  y += 4
  // ─ SECCIÓN C ─────────────────────────────────────────────────────────────
  if (y > 210) { doc.addPage(); addHeader(doc, visita, 2, 3); y = 27 }
  y = sectionHeader(doc, y, 'C', 'Caracterización Sistema Productivo')

  // Especie Principal
  doc.setFillColor(...AMBER_LIGHT)
  doc.rect(15, y, 185, 5, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...AMBER_DARK)
  doc.text('ESPECIE PRINCIPAL (E1)', 17, y + 3.5)
  y += 7

  y = twoCol(doc, y, '24. Especie/Producto Principal', visita.f24_especie_principal, '25. Variedad/Raza', visita.f25_variedad_raza_e1)
  y = twoCol(doc, y, '26. Época cosecha/venta', visita.f26_epoca_cosecha_e1, '27. Tipo de manejo', visita.f27_tipo_manejo_e1)
  y = oneCol(doc, y, '28. Certificación', visita.f28_certificacion_e1)

  if (y > 220) { doc.addPage(); addHeader(doc, visita, 2, 3); y = 27 }

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Temporada','Sup./Colmenas','Cant. Producida','Cant. Vendida PC','Unidad','Monto Vendido PC ($)']],
    body: [
      ['2023 / 2023-24', n(visita.f29_colmenas_2023_e1), n(visita.f31_cant_producida_2023_e1), n(visita.f33_cant_vendida_2023_e1), v(visita.f35_unidad_2023_e1), fmtMoney(visita.f37_monto_vendido_2023_e1)],
      ['2024 / 2024-25', n(visita.f30_colmenas_2024_e1), n(visita.f32_cant_producida_2024_e1), n(visita.f34_cant_vendida_2024_e1), v(visita.f36_unidad_2024_e1), fmtMoney(visita.f38_monto_vendido_2024_e1)],
    ],
    headStyles: { fillColor: AMBER, textColor: WHITE, fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: GRAY_DARK },
    alternateRowStyles: { fillColor: AMBER_LIGHT },
    theme: 'grid',
  })
  y = doc.lastAutoTable.finalY + 5

  if (y > 220) { doc.addPage(); addHeader(doc, visita, 2, 3); y = 27 }

  doc.setFillColor(...AMBER_LIGHT)
  doc.rect(15, y, 185, 5, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...AMBER_DARK)
  doc.text('ESPECIE SECUNDARIA (E2)', 17, y + 3.5)
  y += 7

  y = twoCol(doc, y, '39. Especie/Producto Secundario', visita.f39_especie_secundaria, '40. Variedad/Raza', visita.f40_variedad_raza_e2)
  y = twoCol(doc, y, '41. Época cosecha/venta', visita.f41_epoca_cosecha_e2, '42. Tipo de manejo', visita.f42_tipo_manejo_e2)
  y = oneCol(doc, y, '43. Certificación', visita.f43_certificacion_e2)

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Temporada','Sup./Colmenas','Cant. Producida','Cant. Vendida PC','Unidad','Monto Vendido PC ($)']],
    body: [
      ['2023 / 2023-24', n(visita.f44_colmenas_2023_e2), n(visita.f46_cant_producida_2023_e2), n(visita.f48_cant_vendida_2023_e2), v(visita.f50_unidad_e2), fmtMoney(visita.f52_monto_vendido_2023_e2)],
      ['2024 / 2024-25', n(visita.f45_colmenas_2024_e2), n(visita.f47_cant_producida_2024_e2), n(visita.f49_cant_vendida_2024_e2), v(visita.f50_unidad_e2), fmtMoney(visita.f53_monto_vendido_2024_e2)],
    ],
    headStyles: { fillColor: AMBER, textColor: WHITE, fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: GRAY_DARK },
    alternateRowStyles: { fillColor: AMBER_LIGHT },
    theme: 'grid',
  })
  y = doc.lastAutoTable.finalY + 5

  // Resumen Negocio
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Ingresos Totales ($)','Costo de Producción ($)','Margen Bruto ($)']],
    body: [[fmtMoney(visita.f64_ingresos_totales), fmtMoney(visita.f65_costo_produccion), fmtMoney(visita.f66_margen_bruto)]],
    headStyles: { fillColor: [16,185,129], textColor: WHITE, fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8.5, fontStyle: 'bold', textColor: GRAY_DARK },
    theme: 'grid',
  })
  y = doc.lastAutoTable.finalY + 6

  // ─ SECCIÓN D ─────────────────────────────────────────────────────────────
  if (y > 210) { doc.addPage(); addHeader(doc, visita, 3, 3); y = 27 }
  y = sectionHeader(doc, y, 'D', 'Cumplimiento de Estándares del Poder Comprador')

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['#','Estándar','Tipo','Cumple']],
    body: [
      ['67', v(visita.f67_estandar1), v(visita.f70_tipo_estandar1), v(visita.f73_cumple_estandar1)],
      ['68', v(visita.f68_estandar2), v(visita.f71_tipo_estandar2), v(visita.f74_cumple_estandar2)],
      ['69', v(visita.f69_estandar3), v(visita.f72_tipo_estandar3), v(visita.f75_cumple_estandar3)],
    ],
    columnStyles: { 0:{cellWidth:10}, 1:{cellWidth:105}, 2:{cellWidth:40}, 3:{cellWidth:20,halign:'center'} },
    headStyles: { fillColor: AMBER, textColor: WHITE, fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: GRAY_DARK },
    alternateRowStyles: { fillColor: AMBER_LIGHT },
    theme: 'grid',
  })
  y = doc.lastAutoTable.finalY + 4

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Nivel Comercial','Nivel Productivo','Nivel Calidad e Inocuidad']],
    body: [[v(visita.f76_nivel_comercial), v(visita.f77_nivel_productivo), v(visita.f78_nivel_calidad)]],
    headStyles: { fillColor: [59,130,246], textColor: WHITE, fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, fontStyle: 'bold', textColor: GRAY_DARK, halign: 'center' },
    theme: 'grid',
  })
  y = doc.lastAutoTable.finalY + 6

  // ─ SECCIÓN E ─────────────────────────────────────────────────────────────
  if (y > 200) { doc.addPage(); addHeader(doc, visita, 3, 3); y = 27 }
  y = sectionHeader(doc, y, 'E', 'Principales Puntos Críticos Detectados')

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['#','Punto Crítico','Tipo','Propuesta de Solución','Inversión']],
    body: [
      ['79', v(visita.f79_pc1), v(visita.f84_tipo_pc1), v(visita.f89_solucion_pc1), v(visita.f94_inversion_pc1)],
      ['80', v(visita.f80_pc2), v(visita.f85_tipo_pc2), v(visita.f90_solucion_pc2), v(visita.f95_inversion_pc2)],
      ['81', v(visita.f81_pc3), v(visita.f86_tipo_pc3), v(visita.f91_solucion_pc3), v(visita.f96_inversion_pc3)],
      ['82', v(visita.f82_pc4), v(visita.f87_tipo_pc4), v(visita.f92_solucion_pc4), v(visita.f97_inversion_pc4)],
      ['83', v(visita.f83_pc5), v(visita.f88_tipo_pc5), v(visita.f93_solucion_pc5), v(visita.f98_inversion_pc5)],
    ].filter(r => r[1]),
    columnStyles: { 0:{cellWidth:10}, 1:{cellWidth:55}, 2:{cellWidth:30}, 3:{cellWidth:65}, 4:{cellWidth:25} },
    headStyles: { fillColor: [239,68,68], textColor: WHITE, fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: GRAY_DARK },
    alternateRowStyles: { fillColor: [254,242,242] },
    theme: 'grid',
  })
  y = doc.lastAutoTable.finalY + 6

  // Brechas
  const hasBrechas = [1,2,3,4,5].some(i => visita[`brechas_pc${i}`])
  if (hasBrechas) {
    if (y > 200) { doc.addPage(); addHeader(doc, visita, 3, 3); y = 27 }
    y = sectionHeader(doc, y, 'B2', 'Brechas del Negocio', PURPLE)
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['#','Punto Crítico','Tipo','Propuesta de Solución','Inversión']],
      body: [1,2,3,4,5]
        .map(i => [i, v(visita[`brechas_pc${i}`]), v(visita[`brechas_tipo_pc${i}`]), v(visita[`brechas_solucion_pc${i}`]), v(visita[`brechas_inversion_pc${i}`])])
        .filter(r => r[1]),
      columnStyles: { 0:{cellWidth:10}, 1:{cellWidth:55}, 2:{cellWidth:30}, 3:{cellWidth:65}, 4:{cellWidth:25} },
      headStyles: { fillColor: PURPLE, textColor: WHITE, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: GRAY_DARK },
      alternateRowStyles: { fillColor: PURPLE_LIGHT },
      theme: 'grid',
    })
    y = doc.lastAutoTable.finalY + 4
    if (visita.brechas_nota) y = oneCol(doc, y, 'Nota', visita.brechas_nota)
  }

  // ─ SECCIÓN F ─────────────────────────────────────────────────────────────
  if (y > 230) { doc.addPage(); addHeader(doc, visita, 3, 3); y = 27 }
  y = sectionHeader(doc, y, 'F', 'Observaciones')
  y = twoCol(doc, y, '99. Encuesta', vEncuesta(visita.f99_no_encuesto), 'Encuestador', visita.nombre_encuestador)
  if (visita.f100_notas) y = oneCol(doc, y, '100. Notas', visita.f100_notas)

  // Footer
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setTextColor(180)
    doc.text('PAP Apícola Santa Bárbara-INDAP — Generado: ' + new Date().toLocaleString('es-CL'), M, 274)
    doc.text(`Página ${p} de ${pages}`, W - M, 274, { align: 'right' })
  }

  const nombreApicultor = `${visita.f1_nombre || ''} ${visita.f2_apellido || ''}`.trim() || 'sin_nombre'
  const numEnc = visita.f20_numero_encuesta || '0'
  const filename = `Diagnostico ${numEnc} ${nombreApicultor}`.replace(/[/\\:*?"<>|]/g, '') + '.pdf'
  return { doc, filename }
}

export function exportVisitaPDF(visita) {
  const { doc, filename } = generateVisitaPDF(visita, 'encuesta')
  doc.save(filename)
}

export function printVisitaPDF(visita) {
  const { doc } = generateVisitaPDF(visita, 'diagnostico')
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (win) win.addEventListener('load', () => { win.focus(); win.print() })
}

export function shareVisitaPDF(visita) {
  const { doc, filename } = generateVisitaPDF(visita, 'diagnostico')
  const file = new File([doc.output('blob')], filename, { type: 'application/pdf' })
  shareFile(file)
}

// ── PDF HISTORIAL (múltiples visitas, resumen) ───────────────────────────────
export function generatePDF(visitas) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })
  const W = 279, M = 10

  doc.setFillColor(...AMBER)
  doc.rect(0, 0, W, 18, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('PAP Apícola Santa Bárbara-INDAP — Historial de Diagnósticos', M, 12)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generado: ${new Date().toLocaleString('es-CL')} · Total: ${visitas.length} registros`, W - M, 12, { align: 'right' })

  autoTable(doc, {
    startY: 22,
    margin: { left: M, right: M },
    head: [['Fecha','Nombre','RUT','Región','Poder Comprador','Especie','Col.2024','Prod.2024','Vendido2024','Ingresos','Margen','N.Com','N.Prod','N.Cal']],
    body: visitas.map(v2 => [
      v(v2.f19_fecha_encuesta),
      `${v(v2.f1_nombre)} ${v(v2.f2_apellido)}`.trim(),
      v(v2.f3_rut),
      v(v2.f6_region),
      v(v2.f15_poder_comprador),
      v(v2.f24_especie_principal),
      n(v2.f30_colmenas_2024_e1),
      n(v2.f32_cant_producida_2024_e1),
      fmtMoney(v2.f38_monto_vendido_2024_e1),
      fmtMoney(v2.f64_ingresos_totales),
      fmtMoney(v2.f66_margen_bruto),
      v(v2.f76_nivel_comercial),
      v(v2.f77_nivel_productivo),
      v(v2.f78_nivel_calidad),
    ]),
    headStyles: { fillColor: AMBER, textColor: WHITE, fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, textColor: GRAY_DARK },
    alternateRowStyles: { fillColor: AMBER_LIGHT },
    theme: 'striped',
  })

  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setTextColor(180)
    doc.text('PAP Apícola', M, 208)
    doc.text(`Página ${p} de ${pages}`, W - M, 208, { align: 'right' })
  }

  const filename = `historial_diagnosticos_${new Date().toISOString().slice(0,10)}.pdf`
  return { doc, filename }
}

export function exportPDF(visitas) {
  const { doc, filename } = generatePDF(visitas)
  doc.save(filename)
}

export function sharePDF(visitas) {
  const { doc, filename } = generatePDF(visitas)
  const file = new File([doc.output('blob')], filename, { type: 'application/pdf' })
  shareFile(file)
}

async function shareFile(file) {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name })
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error al compartir:', err)
        alert('No se pudo compartir: ' + err.message)
      }
    }
  } else {
    alert('Compartir archivos no está soportado en este dispositivo')
  }
}

// ── EXCEL INDIVIDUAL POR VISITA ───────────────────────────────────────────────
export function generateVisitaExcel(visita) {
  const wb = XLSX.utils.book_new()

  // ─ Hoja 1: Diagnóstico General ─
  const diagData = [
    ['', 'DIAGNÓSTICO GENERAL — PAP APÍCOLA SANTA BÁRBARA-INDAP', '', '', '', ''],
    ['', `Diagnóstico N° ${v(visita.f20_numero_encuesta)}  ·  Fecha: ${v(visita.f19_fecha_encuesta)}`, '', '', '', ''],
    [],
    ['A.', 'ANTECEDENTES GENERALES'],
    ['#1 Nombre', v(visita.f1_nombre), '#2 Apellido', v(visita.f2_apellido)],
    ['#3 RUT', v(visita.f3_rut), '#4 Teléfono', v(visita.f4_telefono)],
    ['#5 Email', v(visita.f5_email), '#11 Fecha Nacimiento', v(visita.f11_fecha_nacimiento)],
    ['#6 Región', v(visita.f6_region), '#7 Comuna', v(visita.f7_comuna)],
    ['#8 Área INDAP', v(visita.f8_area_indap), '#18 Programa INDAP', v(visita.f18_programa_indap)],
    ['#9 Dirección Propiedad', v(visita.f9_dir_propiedad)],
    ['#10 Dirección Predio', v(visita.f10_dir_predio)],
    ['#12 Género', v(visita.f12_genero), '#13 Pueblo Originario', v(visita.f13_pueblo_originario)],
    ['#14 Nivel Educacional', v(visita.f14_nivel_educacional)],
    ['#15 Poder Comprador', v(visita.f15_poder_comprador), '#16 Rubro/Negocio', v(visita.f16_rubro_negocio)],
    ['#17 Unidad Operativa', v(visita.f17_unidad_operativa), '#19 Fecha Encuesta', v(visita.f19_fecha_encuesta)],
    [],
    ['B.', 'FORMALIZACIÓN DEL NEGOCIO'],
    ['#21 Iniciación Actividades', v(visita.f21_iniciacion_actividades), '#22 Tributación', v(visita.f22_tipo_tributacion)],
    ['#23 Habilitado para comercializar al PC', v(visita.f23_habilitado_poder_comprador)],
    [],
    ['C.', 'CARACTERIZACIÓN SISTEMA PRODUCTIVO'],
    ['', 'ESPECIE PRINCIPAL (E1)'],
    ['#24 Especie/Producto Principal', v(visita.f24_especie_principal), '#25 Variedad/Raza', v(visita.f25_variedad_raza_e1)],
    ['#26 Época cosecha/venta', v(visita.f26_epoca_cosecha_e1), '#27 Tipo de manejo', v(visita.f27_tipo_manejo_e1)],
    ['#28 Certificación', v(visita.f28_certificacion_e1)],
    [],
    ['Temporada','Sup./Colmenas','Cant. Producida','Cant. Vendida PC','Unidad','Monto Vendido PC ($)'],
    ['2023 / 2023-24', n(visita.f29_colmenas_2023_e1), n(visita.f31_cant_producida_2023_e1), n(visita.f33_cant_vendida_2023_e1), v(visita.f35_unidad_2023_e1), n(visita.f37_monto_vendido_2023_e1)],
    ['2024 / 2024-25', n(visita.f30_colmenas_2024_e1), n(visita.f32_cant_producida_2024_e1), n(visita.f34_cant_vendida_2024_e1), v(visita.f36_unidad_2024_e1), n(visita.f38_monto_vendido_2024_e1)],
    [],
    ['', 'ESPECIE SECUNDARIA (E2)'],
    ['#39 Especie/Producto Secundario', v(visita.f39_especie_secundaria), '#40 Variedad/Raza', v(visita.f40_variedad_raza_e2)],
    ['#41 Época cosecha/venta', v(visita.f41_epoca_cosecha_e2), '#42 Tipo de manejo', v(visita.f42_tipo_manejo_e2)],
    ['#43 Certificación', v(visita.f43_certificacion_e2)],
    [],
    ['Temporada','Sup./Colmenas','Cant. Producida','Cant. Vendida PC','Unidad','Monto Vendido PC ($)'],
    ['2023 / 2023-24', n(visita.f44_colmenas_2023_e2), n(visita.f46_cant_producida_2023_e2), n(visita.f48_cant_vendida_2023_e2), v(visita.f50_unidad_e2), n(visita.f52_monto_vendido_2023_e2)],
    ['2024 / 2024-25', n(visita.f45_colmenas_2024_e2), n(visita.f47_cant_producida_2024_e2), n(visita.f49_cant_vendida_2024_e2), v(visita.f50_unidad_e2), n(visita.f53_monto_vendido_2024_e2)],
    [],
    ['Ingresos Totales ($)', n(visita.f64_ingresos_totales), 'Costo Producción ($)', n(visita.f65_costo_produccion), 'Margen Bruto ($)', n(visita.f66_margen_bruto)],
    [],
    ['D.', 'CUMPLIMIENTO DE ESTÁNDARES'],
    ['#','Estándar','Tipo','Cumple'],
    ['67', v(visita.f67_estandar1), v(visita.f70_tipo_estandar1), v(visita.f73_cumple_estandar1)],
    ['68', v(visita.f68_estandar2), v(visita.f71_tipo_estandar2), v(visita.f74_cumple_estandar2)],
    ['69', v(visita.f69_estandar3), v(visita.f72_tipo_estandar3), v(visita.f75_cumple_estandar3)],
    ['Nivel Comercial', v(visita.f76_nivel_comercial), 'Nivel Productivo', v(visita.f77_nivel_productivo), 'Nivel Calidad', v(visita.f78_nivel_calidad)],
    [],
    ['E.', 'PUNTOS CRÍTICOS'],
    ['#','Punto Crítico','Tipo','Propuesta de Solución','¿Requiere inversión?'],
    ['79', v(visita.f79_pc1), v(visita.f84_tipo_pc1), v(visita.f89_solucion_pc1), v(visita.f94_inversion_pc1)],
    ['80', v(visita.f80_pc2), v(visita.f85_tipo_pc2), v(visita.f90_solucion_pc2), v(visita.f95_inversion_pc2)],
    ['81', v(visita.f81_pc3), v(visita.f86_tipo_pc3), v(visita.f91_solucion_pc3), v(visita.f96_inversion_pc3)],
    ['82', v(visita.f82_pc4), v(visita.f87_tipo_pc4), v(visita.f92_solucion_pc4), v(visita.f97_inversion_pc4)],
    ['83', v(visita.f83_pc5), v(visita.f88_tipo_pc5), v(visita.f93_solucion_pc5), v(visita.f98_inversion_pc5)],
    [],
    ['F.', 'OBSERVACIONES'],
    ['#99 Encuesta', vEncuesta(visita.f99_no_encuesto), 'Encuestador', v(visita.nombre_encuestador)],
    ['#100 Notas', v(visita.f100_notas)],
  ]

  const wsDiag = XLSX.utils.aoa_to_sheet(diagData)
  styleSheet(wsDiag, diagData)
  XLSX.utils.book_append_sheet(wb, wsDiag, 'Diagnóstico General')

  // ─ Hoja 2: Brechas ─
  const breachasData = [
    ['', 'BRECHAS DEL NEGOCIO — PAP APÍCOLA SANTA BÁRBARA-INDAP'],
    ['', `Diagnóstico N° ${v(visita.f20_numero_encuesta)} · ${v(visita.f1_nombre)} ${v(visita.f2_apellido)}  ·  ${v(visita.f19_fecha_encuesta)}`],
    [],
    ['Principales Puntos Críticos detectados, para que Usuario sea Proveedor Estable de la Empresa.'],
    [],
    ['#','Punto Crítico','Tipo','Propuesta de Solución','¿Requiere inversión?'],
    [1, v(visita.brechas_pc1), v(visita.brechas_tipo_pc1), v(visita.brechas_solucion_pc1), v(visita.brechas_inversion_pc1)],
    [2, v(visita.brechas_pc2), v(visita.brechas_tipo_pc2), v(visita.brechas_solucion_pc2), v(visita.brechas_inversion_pc2)],
    [3, v(visita.brechas_pc3), v(visita.brechas_tipo_pc3), v(visita.brechas_solucion_pc3), v(visita.brechas_inversion_pc3)],
    [4, v(visita.brechas_pc4), v(visita.brechas_tipo_pc4), v(visita.brechas_solucion_pc4), v(visita.brechas_inversion_pc4)],
    [5, v(visita.brechas_pc5), v(visita.brechas_tipo_pc5), v(visita.brechas_solucion_pc5), v(visita.brechas_inversion_pc5)],
    [],
    ['Nota:', v(visita.brechas_nota)],
    [],
    ['En caso que usuario requiera inversión, deberá estar contemplado en el Plan de Inversión.'],
  ]
  const wsBrechas = XLSX.utils.aoa_to_sheet(breachasData)
  styleSheet(wsBrechas, breachasData)
  XLSX.utils.book_append_sheet(wb, wsBrechas, 'Brechas del negocio')

  const nombreApicultor = `${visita.f1_nombre || ''} ${visita.f2_apellido || ''}`.trim() || 'sin_nombre'
  const numEnc = visita.f20_numero_encuesta || '0'
  const filename = `Diagnostico ${numEnc} ${nombreApicultor}`.replace(/[/\\:*?"<>|]/g, '') + '.xlsx'
  return { wb, filename }
}

export function exportVisitaExcel(visita) {
  const { wb, filename } = generateVisitaExcel(visita)
  XLSX.writeFile(wb, filename)
}

export function shareVisitaExcel(visita) {
  const { wb, filename } = generateVisitaExcel(visita)
  const array = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const file = new File([array], filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  shareFile(file)
}

// ── EXCEL BASE DE DATOS (todas las visitas, orientación vertical) ─────────────
export function generateBaseDatos(visitas) {
  const wb = XLSX.utils.book_new()

  const headers = [
    'N° Encuesta','Fecha Encuesta','Nombre','Apellido','RUT','Teléfono','Email',
    'Región','Comuna','Área INDAP','Dir. Propiedad','Dir. Predio',
    'Fecha Nacimiento','Género','Pueblo Originario','Nivel Educacional',
    'Poder Comprador','Rubro/Negocio','Unidad Operativa','Programa INDAP',
    'Iniciación Actividades','Tributación','Habilitado PC',
    'Especie Principal','Variedad/Raza E1','Época Cosecha E1','Manejo E1','Certif. E1',
    'Colmenas 2023 E1','Colmenas 2024 E1',
    'Cant. Producida 2023 E1','Cant. Producida 2024 E1',
    'Cant. Vendida PC 2023 E1','Cant. Vendida PC 2024 E1',
    'Unidad 2023 E1','Unidad 2024 E1',
    'Monto Vendido 2023 E1','Monto Vendido 2024 E1',
    'Especie Secundaria','Variedad/Raza E2','Época Cosecha E2','Manejo E2','Certif. E2',
    'Colmenas 2023 E2','Colmenas 2024 E2',
    'Cant. Producida 2023 E2','Cant. Producida 2024 E2',
    'Cant. Vendida PC 2023 E2','Cant. Vendida PC 2024 E2',
    'Unidad E2','Monto Vendido 2023 E2','Monto Vendido 2024 E2',
    'Ingresos Totales ($)','Costo Producción ($)','Margen Bruto ($)',
    'Estándar 1','Tipo Est.1','Cumple Est.1',
    'Estándar 2','Tipo Est.2','Cumple Est.2',
    'Estándar 3','Tipo Est.3','Cumple Est.3',
    'Nivel Comercial','Nivel Productivo','Nivel Calidad',
    'PC 1','Tipo PC1','Solución PC1','Inversión PC1',
    'PC 2','Tipo PC2','Solución PC2','Inversión PC2',
    'PC 3','Tipo PC3','Solución PC3','Inversión PC3',
    'PC 4','Tipo PC4','Solución PC4','Inversión PC4',
    'PC 5','Tipo PC5','Solución PC5','Inversión PC5',
    'No se encuestó','Notas','Encuestador',
    'Brecha PC1','Tipo B1','Solución B1','Inversión B1',
    'Brecha PC2','Tipo B2','Solución B2','Inversión B2',
    'Brecha PC3','Tipo B3','Solución B3','Inversión B3',
    'Brecha PC4','Tipo B4','Solución B4','Inversión B4',
    'Brecha PC5','Tipo B5','Solución B5','Inversión B5',
    'Nota Brechas',
  ]

  const sorted = [...visitas].sort((a, b) => {
    const na = parseInt(a.f20_numero_encuesta) || 0
    const nb = parseInt(b.f20_numero_encuesta) || 0
    return na - nb
  })

  const rows = sorted.map(v2 => [
    v(v2.f20_numero_encuesta), v(v2.f19_fecha_encuesta), v(v2.f1_nombre), v(v2.f2_apellido), v(v2.f3_rut),
    v(v2.f4_telefono), v(v2.f5_email), v(v2.f6_region), v(v2.f7_comuna), v(v2.f8_area_indap),
    v(v2.f9_dir_propiedad), v(v2.f10_dir_predio), v(v2.f11_fecha_nacimiento), v(v2.f12_genero),
    v(v2.f13_pueblo_originario), v(v2.f14_nivel_educacional), v(v2.f15_poder_comprador),
    v(v2.f16_rubro_negocio), v(v2.f17_unidad_operativa), v(v2.f18_programa_indap),
    v(v2.f21_iniciacion_actividades), v(v2.f22_tipo_tributacion), v(v2.f23_habilitado_poder_comprador),
    v(v2.f24_especie_principal), v(v2.f25_variedad_raza_e1), v(v2.f26_epoca_cosecha_e1),
    v(v2.f27_tipo_manejo_e1), v(v2.f28_certificacion_e1),
    n(v2.f29_colmenas_2023_e1), n(v2.f30_colmenas_2024_e1),
    n(v2.f31_cant_producida_2023_e1), n(v2.f32_cant_producida_2024_e1),
    n(v2.f33_cant_vendida_2023_e1), n(v2.f34_cant_vendida_2024_e1),
    v(v2.f35_unidad_2023_e1), v(v2.f36_unidad_2024_e1),
    n(v2.f37_monto_vendido_2023_e1), n(v2.f38_monto_vendido_2024_e1),
    v(v2.f39_especie_secundaria), v(v2.f40_variedad_raza_e2), v(v2.f41_epoca_cosecha_e2),
    v(v2.f42_tipo_manejo_e2), v(v2.f43_certificacion_e2),
    n(v2.f44_colmenas_2023_e2), n(v2.f45_colmenas_2024_e2),
    n(v2.f46_cant_producida_2023_e2), n(v2.f47_cant_producida_2024_e2),
    n(v2.f48_cant_vendida_2023_e2), n(v2.f49_cant_vendida_2024_e2),
    v(v2.f50_unidad_e2), n(v2.f52_monto_vendido_2023_e2), n(v2.f53_monto_vendido_2024_e2),
    n(v2.f64_ingresos_totales), n(v2.f65_costo_produccion), n(v2.f66_margen_bruto),
    v(v2.f67_estandar1), v(v2.f70_tipo_estandar1), v(v2.f73_cumple_estandar1),
    v(v2.f68_estandar2), v(v2.f71_tipo_estandar2), v(v2.f74_cumple_estandar2),
    v(v2.f69_estandar3), v(v2.f72_tipo_estandar3), v(v2.f75_cumple_estandar3),
    v(v2.f76_nivel_comercial), v(v2.f77_nivel_productivo), v(v2.f78_nivel_calidad),
    v(v2.f79_pc1), v(v2.f84_tipo_pc1), v(v2.f89_solucion_pc1), v(v2.f94_inversion_pc1),
    v(v2.f80_pc2), v(v2.f85_tipo_pc2), v(v2.f90_solucion_pc2), v(v2.f95_inversion_pc2),
    v(v2.f81_pc3), v(v2.f86_tipo_pc3), v(v2.f91_solucion_pc3), v(v2.f96_inversion_pc3),
    v(v2.f82_pc4), v(v2.f87_tipo_pc4), v(v2.f92_solucion_pc4), v(v2.f97_inversion_pc4),
    v(v2.f83_pc5), v(v2.f88_tipo_pc5), v(v2.f93_solucion_pc5), v(v2.f98_inversion_pc5),
    v(v2.f99_no_encuesto), v(v2.f100_notas), v(v2.nombre_encuestador),
    v(v2.brechas_pc1), v(v2.brechas_tipo_pc1), v(v2.brechas_solucion_pc1), v(v2.brechas_inversion_pc1),
    v(v2.brechas_pc2), v(v2.brechas_tipo_pc2), v(v2.brechas_solucion_pc2), v(v2.brechas_inversion_pc2),
    v(v2.brechas_pc3), v(v2.brechas_tipo_pc3), v(v2.brechas_solucion_pc3), v(v2.brechas_inversion_pc3),
    v(v2.brechas_pc4), v(v2.brechas_tipo_pc4), v(v2.brechas_solucion_pc4), v(v2.brechas_inversion_pc4),
    v(v2.brechas_pc5), v(v2.brechas_tipo_pc5), v(v2.brechas_solucion_pc5), v(v2.brechas_inversion_pc5),
    v(v2.brechas_nota),
  ])

  const totalRow = Array(headers.length).fill('')
  totalRow[0] = `Total encuestas: ${rows.length}`

  const wsDB = XLSX.utils.aoa_to_sheet([headers, ...rows, totalRow])

  const numCols = headers.length
  const numRows = rows.length + 2

  const borderStyle = {
    top:    { style: 'thin', color: { rgb: 'D1A93A' } },
    bottom: { style: 'thin', color: { rgb: 'D1A93A' } },
    left:   { style: 'thin', color: { rgb: 'D1A93A' } },
    right:  { style: 'thin', color: { rgb: 'D1A93A' } },
  }

  for (let R = 0; R < numRows; R++) {
    for (let C = 0; C < numCols; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C })
      if (!wsDB[addr]) wsDB[addr] = { t: 's', v: '' }
      const isHeader = R === 0
      const isTotal  = R === numRows - 1
      wsDB[addr].s = {
        border: borderStyle,
        fill: isHeader
          ? { patternType: 'solid', fgColor: { rgb: 'FFF3CD' } }
          : isTotal
          ? { patternType: 'solid', fgColor: { rgb: 'FEF9EC' } }
          : { patternType: 'none' },
        font: isHeader
          ? { bold: true, color: { rgb: '7A4F01' } }
          : isTotal
          ? { bold: true, color: { rgb: '5A3E00' }, italic: true }
          : { bold: false },
        alignment: { vertical: 'center', wrapText: false },
      }
    }
  }

  wsDB['!freeze'] = { xSplit: 0, ySplit: 1 }
  wsDB['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(numCols - 1)}1` }
  wsDB['!cols'] = headers.map(() => ({ wch: 22 }))
  XLSX.utils.book_append_sheet(wb, wsDB, 'Base de datos')

  const filename = `base_datos_apicola_${new Date().toISOString().slice(0,10)}.xlsx`
  return { wb, filename }
}

export function exportBaseDatos(visitas) {
  const { wb, filename } = generateBaseDatos(visitas)
  XLSX.writeFile(wb, filename)
}

export function shareBaseDatos(visitas) {
  const { wb, filename } = generateBaseDatos(visitas)
  const array = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const file = new File([array], filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  shareFile(file)
}

// ── EXCEL HISTORIAL (resumen) ────────────────────────────────────────────────
export function exportExcel(visitas) {
  exportBaseDatos(visitas)
}

export function shareExcel(visitas) {
  shareBaseDatos(visitas)
}

// ── Helper estilo básico de hoja ──────────────────────────────────────────────
function styleSheet(ws, data) {
  const maxCols = data.reduce((max, row) => Math.max(max, row.length), 0)
  ws['!cols'] = Array.from({ length: maxCols }, (_, i) => ({ wch: i === 1 || i === 3 ? 35 : 20 }))
}

// ── COMPARTIR ARCHIVOS DESDE URL (planillas PDF) ───────────────────────────────
export async function shareURL(url, filename, type = 'application/pdf') {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Error ${response.status} al cargar el archivo`)
    const blob = await response.blob()
    const file = new File([blob], filename, { type })
    shareFile(file)
  } catch (err) {
    console.error('Error al compartir URL:', err)
    alert('No se pudo cargar el archivo para compartir: ' + err.message)
  }
}

// ── APICULTORES (CSV) ─────────────────────────────────────────────────────────
export function generateApicultoresCSV(apicultores) {
  const headers = ['Nombres', 'Apellidos', 'RUT', 'Teléfono', 'Comuna', 'Dirección', 'Programa INDAP']
  const escape = val => '"' + String(val || '').replace(/"/g, '""') + '"'
  const rows = apicultores.map(a => [
    a.nombres, a.apellidos, a.rut, a.telefono, a.comuna, a.direccion, a.programa_indap
  ].map(escape))
  const csv = [headers.join(','), ...rows].join('\n')
  const filename = `apicultores_${new Date().toISOString().slice(0, 10)}.csv`
  return { csv, filename }
}

export function exportApicultores(apicultores) {
  const { csv, filename } = generateApicultoresCSV(apicultores)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function shareApicultores(apicultores) {
  const { csv, filename } = generateApicultoresCSV(apicultores)
  const file = new File([csv], filename, { type: 'text/csv' })
  shareFile(file)
}

// ── BACKUP (JSON) ───────────────────────────────────────────────────────────
export function generateBackup(visitas) {
  const data = { version: 2, exported_at: new Date().toISOString(), visitas }
  const json = JSON.stringify(data, null, 2)
  const filename = `backup_apicola_${new Date().toISOString().slice(0, 10)}.json`
  return { json, filename }
}

export function exportBackup(visitas) {
  const { json, filename } = generateBackup(visitas)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function shareBackup(visitas) {
  const { json, filename } = generateBackup(visitas)
  const file = new File([json], filename, { type: 'application/json' })
  shareFile(file)
}
