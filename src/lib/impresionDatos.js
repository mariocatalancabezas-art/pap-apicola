import { formatPesos } from './proyectosInversion'

export const CAMPOS_IMPRESION = [
  {
    key: 'generales',
    label: 'Antecedentes generales',
    fields: [
      { key: 'apicultor.nombre_completo', label: 'Nombre completo' },
      { key: 'apicultor.rut', label: 'RUT' },
      { key: 'apicultor.telefono', label: 'Teléfono' },
      { key: 'apicultor.n_reg_sag', label: 'N° Reg. SAG' },
      { key: 'apicultor.email', label: 'Email' },
      { key: 'apicultor.comuna', label: 'Comuna' },
      { key: 'apicultor.direccion', label: 'Dirección' },
      { key: 'apicultor.programa_indap', label: 'Programa INDAP' },
      { key: 'apicultor.usuario_sipec', label: 'Usuario SIPEC' },
      { key: 'apicultor.observaciones', label: 'Observaciones' },
    ],
  },
  {
    key: 'antecedentes-diagnostico',
    label: 'Antecedentes del diagnóstico',
    fields: [
      { key: 'diagnostico.f6_region', label: 'Región' },
      { key: 'diagnostico.f7_comuna', label: 'Comuna' },
      { key: 'diagnostico.f8_area_indap', label: 'Área INDAP' },
      { key: 'diagnostico.f9_dir_propiedad', label: 'Dir. Propiedad' },
      { key: 'diagnostico.f10_dir_predio', label: 'Dir. Predio' },
      { key: 'diagnostico.f11_fecha_nacimiento', label: 'Fecha Nacimiento' },
      { key: 'diagnostico.f12_genero', label: 'Género' },
      { key: 'diagnostico.f13_pueblo_originario', label: 'Pueblo Originario' },
      { key: 'diagnostico.f14_nivel_educacional', label: 'Nivel Educacional' },
      { key: 'diagnostico.f15_poder_comprador', label: 'Poder Comprador' },
      { key: 'diagnostico.f16_rubro_negocio', label: 'Rubro/Negocio' },
      { key: 'diagnostico.f17_unidad_operativa', label: 'Unidad Operativa' },
      { key: 'diagnostico.f18_programa_indap', label: 'Programa INDAP' },
      { key: 'diagnostico.f19_fecha_encuesta', label: 'Fecha Encuesta' },
      { key: 'diagnostico.f20_numero_encuesta', label: 'N° Encuesta' },
      { key: 'diagnostico.nombre_encuestador', label: 'Encuestador' },
    ],
  },
  {
    key: 'diagnostico',
    label: 'Diagnóstico',
    fields: [
      { key: 'diagnostico.f21_iniciacion_actividades', label: 'Iniciación de Actividades' },
      { key: 'diagnostico.f24_especie_principal', label: 'Producto principal' },
      { key: 'diagnostico.f39_especie_secundaria', label: 'Producto secundario' },
      { key: 'diagnostico.f67_estandar1', label: 'Estándar 1' },
      { key: 'diagnostico.f70_tipo_estandar1', label: 'Tipo Estándar 1' },
      { key: 'diagnostico.f73_cumple_estandar1', label: 'Cumple Estándar 1' },
      { key: 'diagnostico.f68_estandar2', label: 'Estándar 2' },
      { key: 'diagnostico.f71_tipo_estandar2', label: 'Tipo Estándar 2' },
      { key: 'diagnostico.f74_cumple_estandar2', label: 'Cumple Estándar 2' },
      { key: 'diagnostico.f69_estandar3', label: 'Estándar 3' },
      { key: 'diagnostico.f72_tipo_estandar3', label: 'Tipo Estándar 3' },
      { key: 'diagnostico.f75_cumple_estandar3', label: 'Cumple Estándar 3' },
    ],
  },
  {
    key: 'asb',
    label: 'Preguntas ASB',
    fields: [
      { key: 'diagnostico.asb_nos_entrego_miel', label: '¿Nos entregó miel?' },
      { key: 'diagnostico.asb_sala_autorizada', label: '¿Sala autorizada?' },
      { key: 'diagnostico.asb_sala_pronta_autorizar', label: '¿Sala pronta a autorizar?' },
      { key: 'diagnostico.asb_que_le_falta', label: 'Qué le falta:' },
      { key: 'diagnostico.asb_anios_apicultura', label: '¿Cuántos años lleva en la Apicultura?' },
      { key: 'diagnostico.asb_motivacion', label: '¿Qué lo motiva a seguir en la apicultura?' },
      { key: 'diagnostico.asb_talleres_interes', label: 'Talleres o capacitaciones de interés' },
    ],
  },
  {
    key: 'proyectos',
    label: 'Proyectos de inversión',
    fields: [
      { key: 'proyecto.nombre_proyecto', label: 'Nombre del proyecto' },
      { key: 'proyecto.detalle_proyecto', label: 'Detalle del proyecto' },
      { key: 'proyecto.monto_indap', label: 'Monto INDAP' },
      { key: 'proyecto.monto_propio', label: 'Monto propio' },
      { key: 'proyecto.monto_credito', label: 'Monto crédito' },
      { key: 'proyecto.monto_total', label: 'Monto total' },
      { key: 'proyecto.estado', label: 'Estado del proyecto' },
    ],
  },
]

const CAMPOS_CON_FORMATO_SI_NO = new Set([
  'diagnostico.f21_iniciacion_actividades',
])
const CAMPOS_CON_FORMATO_CUMPLIMIENTO = new Set([
  'diagnostico.f73_cumple_estandar1',
  'diagnostico.f74_cumple_estandar2',
  'diagnostico.f75_cumple_estandar3',
])
const CAMPOS_ASB_SI_NO = new Set([
  'diagnostico.asb_nos_entrego_miel',
  'diagnostico.asb_sala_autorizada',
  'diagnostico.asb_sala_pronta_autorizar',
])
const CAMPOS_MONTO = new Set([
  'proyecto.monto_indap',
  'proyecto.monto_propio',
  'proyecto.monto_credito',
  'proyecto.monto_total',
])

export function nombreCompleto(apicultor) {
  return (
    apicultor?.nombre_completo
    || `${apicultor?.nombres || ''} ${apicultor?.apellidos || ''}`.trim()
  )
}

export function normalizarRut(rut) {
  return String(rut || '').replace(/[^0-9kK]/g, '').toUpperCase()
}

export function normalizarNombre(nombre) {
  return String(nombre || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function formatearRut(rut) {
  const limpio = normalizarRut(rut)
  if (limpio.length < 2) return rut || ''
  const cuerpo = limpio.slice(0, -1)
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${limpio.slice(-1)}`
}

function formatearSiNo(value) {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 's' || normalized === 'si') return 'Sí'
  if (normalized === 'n' || normalized === 'no') return 'No'
  return value || ''
}

function formatearCumplimiento(value) {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 's' || normalized === 'si' || normalized === 'cumple') return 'Cumple'
  if (normalized === 'n' || normalized === 'no' || normalized === 'no cumple') return 'No cumple'
  return value || ''
}

export function getCampoValue(apicultor, diagnostico, proyecto, key) {
  if (!key) return ''
  const [origen, campo] = key.split('.')
  if (origen === 'proyecto' && !proyecto) return 'Sin proyecto'

  const source = origen === 'apicultor'
    ? apicultor
    : origen === 'diagnostico'
      ? diagnostico
      : proyecto
  const value = key === 'proyecto.estado'
    ? 'Con proyecto'
    : source?.[campo]

  if (key === 'apicultor.rut') return formatearRut(value)
  if (CAMPOS_CON_FORMATO_SI_NO.has(key) || CAMPOS_ASB_SI_NO.has(key)) {
    return formatearSiNo(value)
  }
  if (CAMPOS_CON_FORMATO_CUMPLIMIENTO.has(key)) return formatearCumplimiento(value)
  if (CAMPOS_MONTO.has(key)) return formatPesos(value)
  return value === null || value === undefined ? '' : String(value)
}

export function findCampo(key) {
  return CAMPOS_IMPRESION
    .flatMap(group => group.fields)
    .find(field => field.key === key)
}
