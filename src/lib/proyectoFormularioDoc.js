import { formatPesos, parseMonto } from './proyectosInversion'

function esc(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function campo(valor) {
  const v = String(valor ?? '').trim()
  return v ? esc(v).replace(/\r?\n/g, '<br/>') : '&nbsp;'
}

function fila2col(label, valor) {
  return `<tr>
    <td class="label">${esc(label)}</td>
    <td>${campo(valor)}</td>
  </tr>`
}

function bloqueTexto(titulo, nota, valor) {
  return `<tr>
    <td class="label" colspan="2">
      ${esc(titulo)}${nota ? `<div class="nota">${esc(nota)}</div>` : ''}
      <div class="contenido">${campo(valor)}</div>
    </td>
  </tr>`
}

export function generarHtmlFormulario(p) {
  const f = p.formulario || {}
  const anio = p.anio || 2026
  const gantt = Array.isArray(f.gantt) ? f.gantt : []
  const items = Array.isArray(f.inversion_items) ? f.inversion_items : []

  const ganttRows = gantt.map(a => {
    const checks = Array.from({ length: 6 }, (_, i) =>
      `<td class="c">${a.semanas?.[i] ? 'X' : ''}</td>`
    ).join('')
    return `<tr><td>${campo(a.actividad)}</td>${checks}</tr>`
  }).join('')

  const itemRows = items.map(it => `<tr>
    <td>${campo(it.tipo)}</td>
    <td>${campo(it.item)}</td>
    <td>${campo(it.producto)}</td>
    <td>${campo(it.unidad)}</td>
    <td>${campo(it.medida)}</td>
    <td class="num">${it.precio_unitario ? formatPesos(it.precio_unitario) : ''}</td>
    <td class="num">${it.monto ? formatPesos(it.monto) : ''}</td>
  </tr>`).join('')

  const montoIndap = parseMonto(p.monto_indap)
  const montoPropio = parseMonto(p.monto_propio)
  const montoCredito = p.solicita_credito ? parseMonto(p.monto_credito) : 0
  const montoValorizado = p.aporte_valorizado ? parseMonto(p.monto_valorizado) : 0
  const montoTotal = parseMonto(p.monto_total) || (montoIndap + montoPropio + montoCredito + montoValorizado)

  const logoUrl = `${window.location.origin}/Logo/LOGO%20INDAP.png`

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="utf-8">
<title>Formulario de Postulación PDI</title>
<style>
  @page { size: letter; margin: 2cm; }
  body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; }
  .logo { text-align: left; margin-bottom: 6px; }
  .logo img { height: 70px; }
  h1 { font-size: 12pt; text-align: center; margin: 0 0 2px; page-break-after: avoid; }
  h2 { font-size: 11pt; text-align: center; margin: 0 0 14px; page-break-after: avoid; }
  h3 { font-size: 11pt; margin: 14px 0 4px; page-break-after: avoid; }
  .salto-pagina { page-break-before: always; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  tr { page-break-inside: avoid; }
  td, th { border: 1px solid #000; padding: 4px 6px; vertical-align: top; font-size: 10pt; }
  th { background: #e8e8e8; text-align: center; font-size: 9pt; }
  .label { background: #f2f2f2; font-weight: bold; width: 32%; }
  .nota { font-weight: normal; font-size: 8pt; color: #444; font-style: italic; }
  .contenido { font-weight: normal; padding-top: 4px; min-height: 40px; }
  .c { text-align: center; width: 6%; }
  .num { text-align: right; white-space: nowrap; }
  .firmas { table-layout: fixed; margin-top: 30px; }
  .firmas td { border: none; }
  .firma-td { height: 110px; vertical-align: bottom; text-align: center; width: 50%; }
  .firma-box { margin: 0 20px; }
  .firma-nombre { border-top: 1px solid #000; padding-top: 4px; font-weight: bold; }
</style>
</head>
<body>

<div class="logo"><img src="${logoUrl}" alt="INDAP"/></div>
<h1>FORMULARIO DE POSTULACIÓN (FORMATO OBLIGATORIO)</h1>
<h2>CONCURSO ESPECIAL PDI ALIANZAS PRODUCTIVAS AÑO ${anio}</h2>

<h3>1.- Portada del Proyecto</h3>
<table>
  ${fila2col('Concurso PDI', 'PDI ALIANZAS PRODUCTIVAS')}
  ${fila2col('Nombre de postulante', p.apicultor_nombre)}
  ${fila2col('RUT de postulante', p.apicultor_rut)}
  ${fila2col('Agencia de área', f.agencia_area)}
  ${fila2col('Comuna', p.apicultor_comuna)}
</table>

<h3>2.- Información General del Proyecto</h3>
<table>
  ${bloqueTexto('Antecedentes del usuario/a', '', f.antecedentes_usuario)}
  ${bloqueTexto('Identificación del predio', '', f.identificacion_predio)}
  ${bloqueTexto('Régimen de tenencia del predio', '', f.regimen_tenencia_predio)}
  ${bloqueTexto('Régimen de tenencia del agua', '', f.regimen_tenencia_agua)}
  ${fila2col('Nombre del proyecto', p.nombre_proyecto)}
  ${bloqueTexto('Fundamentación del proyecto', 'Es el Por qué', f.fundamentacion)}
  ${bloqueTexto('Objetivos del proyecto', 'Es el Para qué', f.objetivos)}
  ${bloqueTexto('Descripción del proyecto', 'Es el Qué', f.descripcion)}
  ${bloqueTexto('Impacto del proyecto', 'Es el Qué cambio. Diferencia entre situación inicial (problema) y situación final (solución)', f.impacto)}
</table>

<h3 class="salto-pagina">3.- Antecedentes Técnicos del Proyecto</h3>
<table>
  ${bloqueTexto('Descripción del o los rubros principales que involucra el proyecto', '', f.rubros_principales)}
  ${bloqueTexto('Descripción de la producción', '¿Cuánto produce? ¿Cómo mejoraría la producción una vez incorporado el proyecto?', f.descripcion_produccion)}
</table>

<h3>4.- Carta Gantt del Proyecto</h3>
<p style="font-size:9pt; margin:0 0 4px">Actividades en la ejecución de las inversiones — periodo de ejecución: 45 días / 6 semanas</p>
<table>
  <tr><th>Actividad</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th></tr>
  ${ganttRows || '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>'}
</table>

<h3>5.- Montos del Proyecto</h3>
<p style="font-size:10pt; font-weight:bold; margin:0 0 4px">Inversiones del Proyecto</p>
<table>
  <tr>
    <th>Tipo de Inversión</th><th>Ítem de Inversión</th><th>Producto</th>
    <th>Unidad</th><th>Medida</th><th>Precio unitario</th><th>Monto total</th>
  </tr>
  ${itemRows || '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>'}
  <tr><td colspan="6" class="label">Monto total Inversión</td><td class="num"><strong>${formatPesos(montoTotal)}</strong></td></tr>
</table>

<p style="font-size:10pt; font-weight:bold; margin:8px 0 4px">Financiamiento del Proyecto</p>
<table>
  <tr><th>Incentivo INDAP ($)</th><th>Aporte Propio ($)</th><th>Monto total Inversión ($)</th></tr>
  <tr>
    <td class="num">${formatPesos(montoIndap)}</td>
    <td class="num">${formatPesos(montoPropio + montoCredito + montoValorizado)}</td>
    <td class="num"><strong>${formatPesos(montoTotal)}</strong></td>
  </tr>
</table>

<table class="firmas">
  <tr>
    <td class="firma-td"><div class="firma-box"><div class="firma-nombre">Firma<br/>Nombre y apellidos de postulante</div><div>${campo(p.apicultor_nombre)}</div></div></td>
    <td class="firma-td"><div class="firma-box"><div class="firma-nombre">Firma<br/>Nombre y apellidos Formulador de la postulación</div><div>${campo(f.formulador)}</div></div></td>
  </tr>
</table>

</body>
</html>`
}

export function descargarWord(p) {
  const html = generarHtmlFormulario(p)
  const blob = new Blob(['﻿', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const slug = (p.apicultor_nombre || 'proyecto')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'proyecto'
  const a = document.createElement('a')
  a.href = url
  a.download = `formulario-postulacion-pdi-${slug}.doc`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function imprimirFormulario(p) {
  const html = generarHtmlFormulario(p)
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 400)
}
