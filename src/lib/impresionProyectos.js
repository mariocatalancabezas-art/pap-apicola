import { formatPesos, parseMonto } from './proyectosInversion'

export const CAMPOS_PROYECTO = [
  {
    key: 'portada',
    label: 'Portada del proyecto',
    fields: [
      { key: 'apicultor_rut', label: 'RUT de postulante' },
      { key: 'apicultor_comuna', label: 'Comuna' },
      { key: 'apicultor_direccion', label: 'Dirección/sector' },
      { key: 'apicultor_telefono', label: 'Teléfono' },
      { key: 'apicultor_email', label: 'Correo electrónico' },
      { key: 'formulario.agencia_area', label: 'Agencia de área' },
    ],
  },
  {
    key: 'proyecto',
    label: 'Proyecto',
    fields: [
      { key: 'nombre_proyecto', label: 'Nombre del proyecto' },
      { key: 'anio', label: 'Año' },
      { key: 'formulario.antecedentes_usuario', label: 'Antecedentes del usuario/a' },
      { key: 'formulario.identificacion_predio', label: 'Identificación del predio' },
      { key: 'formulario.regimen_tenencia_predio', label: 'Régimen tenencia del predio' },
      { key: 'formulario.regimen_tenencia_agua', label: 'Régimen tenencia del agua' },
      { key: 'formulario.fundamentacion', label: 'Fundamentación (Por qué)' },
      { key: 'formulario.objetivos', label: 'Objetivos (Para qué)' },
      { key: 'formulario.descripcion', label: 'Descripción (Qué)' },
      { key: 'formulario.impacto', label: 'Impacto (Qué cambio)' },
    ],
  },
  {
    key: 'tecnicos',
    label: 'Antecedentes técnicos',
    fields: [
      { key: 'formulario.rubros_principales', label: 'Rubros principales' },
      { key: 'formulario.descripcion_produccion', label: 'Descripción de la producción' },
      { key: 'formulario.gantt_resumen', label: 'Carta Gantt (actividades)' },
    ],
  },
  {
    key: 'montos',
    label: 'Montos y financiamiento',
    fields: [
      { key: 'monto_indap', label: 'Incentivo INDAP' },
      { key: 'monto_propio', label: 'Aporte propio' },
      { key: 'monto_valorizado', label: 'Aporte valorizado' },
      { key: 'monto_credito', label: 'Crédito Indap' },
      { key: 'monto_total', label: 'Monto total' },
      { key: 'solicita_credito', label: 'Solicita crédito' },
      { key: 'formulario.inversion_resumen', label: 'Ítems de inversión' },
      { key: 'formulario.inversion_total_items', label: 'Suma ítems de inversión' },
    ],
  },
  {
    key: 'firmas',
    label: 'Firmas y registro',
    fields: [
      { key: 'formulario.formulador', label: 'Formulador de la postulación' },
      { key: 'created_by', label: 'Creado por' },
      { key: 'created_at', label: 'Fecha de creación' },
      { key: 'updated_at', label: 'Última actualización' },
    ],
  },
]

export function findCampoProyecto(key) {
  return CAMPOS_PROYECTO.flatMap(g => g.fields).find(f => f.key === key)
}

const CAMPOS_MONTO = new Set(['monto_indap', 'monto_propio', 'monto_valorizado', 'monto_credito', 'monto_total'])

function formatearFecha(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return String(iso)
  return d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function getValorProyecto(proyecto, key) {
  if (!key) return ''
  const f = proyecto?.formulario || {}

  if (key === 'solicita_credito') return proyecto?.solicita_credito ? 'Sí' : 'No'
  if (key === 'formulario.gantt_resumen') {
    const g = Array.isArray(f.gantt) ? f.gantt : []
    return g.map((a, i) => {
      const semanas = (a.semanas || []).map((s, j) => s ? j + 1 : null).filter(Boolean)
      return `${i + 1}. ${a.actividad || ''}${semanas.length ? ` (semanas ${semanas.join(', ')})` : ''}`
    }).join('\n')
  }
  if (key === 'formulario.inversion_resumen') {
    const items = Array.isArray(f.inversion_items) ? f.inversion_items : []
    return items.map(it => {
      const partes = [it.item, it.producto, it.unidad, it.medida].filter(Boolean).join(' · ')
      const monto = parseMonto(it.monto)
      return `${it.tipo || ''} — ${partes}${monto ? ` — ${formatPesos(monto)}` : ''}`.trim()
    }).join('\n')
  }
  if (key === 'formulario.inversion_total_items') {
    const items = Array.isArray(f.inversion_items) ? f.inversion_items : []
    const total = items.reduce((s, it) => s + parseMonto(it.monto), 0)
    return total ? formatPesos(total) : ''
  }

  if (key.startsWith('formulario.')) {
    const campo = key.slice('formulario.'.length)
    return f[campo] ?? ''
  }

  const value = proyecto?.[key]
  if (CAMPOS_MONTO.has(key)) return formatPesos(value)
  if (key === 'created_at' || key === 'updated_at') return formatearFecha(value)
  return value === null || value === undefined ? '' : String(value)
}
