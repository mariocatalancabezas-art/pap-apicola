import { formatPesos } from './proyectosInversion'

export const DOCUMENTACION_REQUERIDA = [
  { tipo: 'doc_tenencia', label: 'Contrato o acreditación de tenencia actualizada del predio' },
  { tipo: 'doc_dominio', label: 'Dominio vigente del predio' },
  { tipo: 'doc_uso_suelo', label: 'Certificado de Uso de Suelo' },
  { tipo: 'doc_croquis', label: 'Croquis (diseño de la infraestructura)' },
  { tipo: 'doc_emplazamiento', label: 'Fotografía mapa emplazamiento de la construcción' },
]

function valorTexto(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === '') return '—'
  return String(valor)
}

export function datosInforme(form, {
  montoIndap,
  montoPropio,
  montoValorizado,
  montoCredito,
  montoTotal,
  pctAporte,
}) {
  const parrafos = String(form.detalle_proyecto || '')
    .split(/\r?\n/)
    .map(parrafo => parrafo.trim())
    .filter(Boolean)

  const montos = [
    { concepto: 'Aporte Indap', monto: formatPesos(montoIndap) },
    { concepto: 'Aporte propio usuario', monto: formatPesos(montoPropio) },
  ]
  if (form.aporte_valorizado) {
    montos.push({ concepto: 'Aporte valorizado', monto: formatPesos(montoValorizado) })
  }
  if (form.solicita_credito) {
    montos.push({ concepto: 'Crédito Indap', monto: formatPesos(montoCredito) })
  }
  montos.push(
    { concepto: 'Monto total del proyecto', monto: formatPesos(montoTotal) },
    {
      concepto: 'Aporte del usuario respecto del Aporte Indap',
      monto: `${Number(pctAporte || 0).toFixed(1)}%`,
    },
  )

  return {
    titulo: 'INFORME TÉCNICO DEL PROYECTO DE INVERSIÓN',
    datosApicultor: [
      { label: 'Nombre completo', valor: valorTexto(form.apicultor_nombre) },
      { label: 'RUT', valor: valorTexto(form.apicultor_rut) },
      { label: 'Teléfono', valor: valorTexto(form.apicultor_telefono) },
      { label: 'Dirección/sector', valor: valorTexto(form.apicultor_direccion) },
      { label: 'Comuna', valor: valorTexto(form.apicultor_comuna) },
      { label: 'Correo electrónico', valor: valorTexto(form.apicultor_email) },
    ],
    proyecto: [
      { label: 'Nombre del proyecto', valor: valorTexto(form.nombre_proyecto) },
      { label: 'Año del proyecto', valor: valorTexto(form.anio || 2026) },
    ],
    montos,
    informeTecnico: parrafos.length > 0 ? parrafos : ['Sin informe técnico redactado.'],
    notaValorizado: form.aporte_valorizado
      ? `Proyecto con aporte valorizado de ${formatPesos(montoValorizado)}: considerado en el aporte del usuario.`
      : null,
  }
}
