import jsPDF from 'jspdf'

const AMBER = [245, 158, 11]
const WHITE = [255, 255, 255]
const GRAY_DARK = [55, 65, 81]
const GRAY_MID = [107, 114, 128]

function v(val) { return (val === undefined || val === null) ? '' : String(val) }

// Carta: 216 x 279 mm. Márgenes laterales 18 mm, superior tras encabezado.
const W = 216
const M = 18
const CONTENT_W = W - M * 2

function header(doc, titulo, visita) {
  doc.setFillColor(...AMBER)
  doc.rect(0, 0, W, 22, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('PAP Apícola Santa Bárbara-INDAP', M, 10)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(titulo, M, 17)
  doc.setTextColor(...GRAY_DARK)
}

function ensureSpace(doc, y, needed, titulo, visita) {
  if (y + needed > 268) {
    doc.addPage()
    header(doc, titulo, visita)
    return 30
  }
  return y
}

function sectionHeader(doc, y, title, ctx) {
  y = ensureSpace(doc, y, 12, ctx.titulo, ctx.visita)
  doc.setFillColor(...AMBER)
  doc.rect(M, y, CONTENT_W, 6, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(title.toUpperCase(), M + 2, y + 4.2)
  doc.setTextColor(...GRAY_DARK)
  return y + 10
}

function twoCol(doc, y, l1, v1, l2, v2, ctx) {
  y = ensureSpace(doc, y, 10, ctx.titulo, ctx.visita)
  const colW = CONTENT_W / 2
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY_MID)
  doc.text(l1 + ':', M, y)
  if (l2 != null) doc.text(l2 + ':', M + colW, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY_DARK)
  doc.setFontSize(9)
  doc.text(doc.splitTextToSize(v(v1), colW - 4), M, y + 4.5)
  if (l2 != null) doc.text(doc.splitTextToSize(v(v2), colW - 4), M + colW, y + 4.5)
  return y + 10
}

function block(doc, y, label, val, ctx) {
  const lines = doc.splitTextToSize(v(val) || '—', CONTENT_W)
  y = ensureSpace(doc, y, 6 + lines.length * 4.5, ctx.titulo, ctx.visita)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY_MID)
  doc.text(label + ':', M, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY_DARK)
  doc.setFontSize(9)
  doc.text(lines, M, y + 4.5)
  return y + 4.5 + lines.length * 4.5 + 3
}

function footer(doc) {
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setTextColor(180)
    doc.text('PAP Apícola Santa Bárbara-INDAP — Generado: ' + new Date().toLocaleString('es-CL'), M, 274)
    doc.text(`Página ${p} de ${pages}`, W - M, 274, { align: 'right' })
  }
}

function buildFilename(tipo, nombre, fecha) {
  const base = `Visita ${tipo} ${nombre || 'sin nombre'} ${fecha || ''}`.trim()
  return base.replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, ' ') + '.pdf'
}

// ── VISITA ADMINISTRATIVA ─────────────────────────────────────────────────────
export function generateVisitaAdminPDF(visita) {
  const titulo = 'Visita Administrativa'
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const ctx = { titulo, visita }
  header(doc, titulo, visita)
  let y = 30

  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY_DARK)
  doc.text('VISITA ADMINISTRATIVA', W / 2, y, { align: 'center' })
  y += 10

  y = twoCol(doc, y, 'Nombre Técnico', visita.va_nombre_tecnico, 'Fecha visita', visita.va_fecha_visita, ctx)

  y = sectionHeader(doc, y, 'Antecedentes del Apicultor', ctx)
  y = twoCol(doc, y, 'Nombre completo', visita.f1_nombre, 'RUT', visita.f3_rut, ctx)
  y = twoCol(doc, y, 'Teléfono', visita.f4_telefono, 'Correo', visita.f5_email, ctx)
  y = twoCol(doc, y, 'Dirección/sector', visita.f9_dir_propiedad, 'Comuna', visita.f7_comuna, ctx)

  y = sectionHeader(doc, y, 'Acta de la Visita', ctx)
  const tema = visita.va_tema_principal === 'Otro' ? (visita.va_tema_otro || 'Otro') : visita.va_tema_principal
  y = block(doc, y, 'Tema Principal', tema, ctx)
  y = block(doc, y, 'Observaciones', visita.va_observaciones, ctx)
  y = block(doc, y, 'Acuerdos o Compromisos', visita.va_acuerdos, ctx)

  y = sectionHeader(doc, y, 'Firmas', ctx)
  y = twoCol(doc, y, 'Firma Asesor', visita.va_firma_asesor, 'Firma Usuario', visita.va_firma_usuario, ctx)

  footer(doc)
  const filename = buildFilename('Administrativa', visita.f1_nombre, visita.va_fecha_visita)
  return { doc, filename }
}

// ── VISITA TÉCNICA ────────────────────────────────────────────────────────────
export function generateVisitaTecnicaPDF(visita) {
  const titulo = 'Visita Técnica'
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const ctx = { titulo, visita }
  header(doc, titulo, visita)
  let y = 30

  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY_DARK)
  doc.text('VISITA TÉCNICA', W / 2, y, { align: 'center' })
  y += 10

  y = twoCol(doc, y, 'Nombre Técnico', visita.vt_nombre_tecnico, 'Fecha visita', visita.vt_fecha_visita, ctx)

  y = sectionHeader(doc, y, 'Antecedentes del Apicultor', ctx)
  y = twoCol(doc, y, 'Nombre completo', visita.f1_nombre, 'RUT', visita.f3_rut, ctx)
  y = twoCol(doc, y, 'Teléfono', visita.f4_telefono, 'Correo', visita.f5_email, ctx)
  y = twoCol(doc, y, 'Dirección/sector', visita.f9_dir_propiedad, 'Comuna', visita.f7_comuna, ctx)

  y = sectionHeader(doc, y, 'Datos del Apiario', ctx)
  y = twoCol(doc, y, 'Nombre del apiario', visita.vt_nombre_apiario, 'N° de colmenas', visita.vt_num_colmenas, ctx)
  y = block(doc, y, 'Actividad principal', visita.vt_actividad_principal, ctx)

  y = sectionHeader(doc, y, 'Condición Sanitaria', ctx)
  y = twoCol(doc, y, 'Varroa (%)', visita.vt_varroa_pct, 'Último tratamiento', visita.vt_fecha_ultimo_tratamiento, ctx)
  y = block(doc, y, 'Enfermedades observadas', visita.vt_enfermedades, ctx)
  y = block(doc, y, 'Tratamientos aplicados', visita.vt_tratamientos, ctx)

  y = sectionHeader(doc, y, 'Producción', ctx)
  y = twoCol(doc, y, 'Temporada anterior (kg)', visita.vt_prod_anterior, 'Estimada actual (kg)', visita.vt_prod_estimada, ctx)
  y = block(doc, y, 'Tipo de miel', visita.vt_tipo_miel, ctx)

  y = sectionHeader(doc, y, 'Manejo Técnico', ctx)
  y = twoCol(doc, y, 'Alimentación', visita.vt_alimentacion, 'Renovación reinas (%)', visita.vt_renovacion_reinas, ctx)
  y = twoCol(doc, y, 'Recambio marcos (%)', visita.vt_recambio_marcos, 'Calendario de manejo', visita.vt_calendario_manejo, ctx)

  y = sectionHeader(doc, y, 'Observaciones de la Visita', ctx)
  y = block(doc, y, 'Problemas detectados', visita.vt_problemas, ctx)
  y = block(doc, y, 'Recomendaciones técnicas', visita.vt_recomendaciones, ctx)
  y = block(doc, y, 'Compromisos del apicultor', visita.vt_compromisos, ctx)
  y = twoCol(doc, y, 'Próxima visita', visita.vt_fecha_proxima_visita, null, null, ctx)

  if (visita.vt_informe) {
    y = sectionHeader(doc, y, 'Informe Visita', ctx)
    y = block(doc, y, 'Actividad realizada', visita.vt_informe, ctx)
  }

  y = sectionHeader(doc, y, 'Firmas', ctx)
  y = twoCol(doc, y, 'Firma técnico', visita.vt_firma_tecnico, 'Firma apicultor', visita.vt_firma_apicultor, ctx)

  footer(doc)
  const filename = buildFilename('Tecnica', visita.f1_nombre, visita.vt_fecha_visita)
  return { doc, filename }
}

function generate(tipo, visita) {
  return tipo === 'tecnica' ? generateVisitaTecnicaPDF(visita) : generateVisitaAdminPDF(visita)
}

export function exportVisitaPlanillaPDF(tipo, visita) {
  const { doc, filename } = generate(tipo, visita)
  doc.save(filename)
}

export function printVisitaPlanillaPDF(tipo, visita) {
  const { doc } = generate(tipo, visita)
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (win) {
    win.addEventListener('load', () => { win.focus(); win.print() })
  } else {
    // Fallback: usar iframe oculto si el navegador bloquea la ventana
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.src = url
    document.body.appendChild(iframe)
    iframe.addEventListener('load', () => { iframe.contentWindow.focus(); iframe.contentWindow.print() })
  }
}
