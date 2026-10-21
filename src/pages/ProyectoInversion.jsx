import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Save, ChevronLeft, Briefcase, User, AlertTriangle, FileDown, Printer,
  Loader2, Plus, Trash2,
} from 'lucide-react'
import { buscarApicultoresPorNombre } from '../lib/importApicultores'
import { db } from '../lib/db'
import VoiceInput from '../components/VoiceInput'
import { useAuth } from '../lib/AuthContext'
import {
  MAX_APORTE_INDAP, PORCENTAJE_MINIMO_APORTE,
  ANIOS_PROYECTO,
  crearProyecto, editarProyecto, getProyecto,
  formatMiles, formatPesos, parseMonto, porcentajeAporte, distribuirTotalProyecto,
} from '../lib/proyectosInversion'
import { descargarWord, imprimirFormulario } from '../lib/proyectoFormularioDoc'

const SEMANAS = 6
const TIPOS_INVERSION = ['Inversión física', 'Mano de obra y flete']

const EMPTY_FORMULARIO = {
  agencia_area: 'Agencia Santa Barbara',
  antecedentes_usuario: '',
  identificacion_predio: '',
  regimen_tenencia_predio: '',
  regimen_tenencia_agua: '',
  fundamentacion: '',
  objetivos: '',
  descripcion: '',
  impacto: '',
  rubros_principales: 'Apicultura',
  descripcion_produccion: '',
  formulador: '',
  plano: '',
  gantt: [],
  inversion_items: [],
}

const OPCIONES_NOMBRE_PROYECTO = [
  'Construcción Sala extracción',
  'Mejoramiento Sala extracción',
  'Construcción bodega',
  'Maquinaria',
]

const EMPTY = {
  apicultor_nombre: '',
  apicultor_rut: '',
  apicultor_telefono: '',
  apicultor_comuna: '',
  apicultor_direccion: '',
  apicultor_email: '',
  nombre_proyecto: '',
  detalle_proyecto: '',
  monto_indap: '',
  monto_propio: '',
  anio: 2026,
  aporte_valorizado: false,
  monto_valorizado: '',
  solicita_credito: false,
  monto_credito: '',
  formulario: { ...EMPTY_FORMULARIO },
}

const normStr = s => String(s || '').toUpperCase().trim()

async function obtenerDiagnostico({ rut, nombre }) {
  try {
    const visitas = await db.visitas.toArray()
    const activas = visitas.filter(v => !v.deleted_at)
    const rutN = normStr(rut).replace(/[.\-]/g, '')
    const nomN = normStr(nombre)
    return (rutN && activas.find(v => normStr(v.f3_rut).replace(/[.\-]/g, '') === rutN))
      || (nomN && activas.find(v => normStr(`${v.f1_nombre || ''} ${v.f2_apellido || ''}`) === nomN))
      || null
  } catch {
    return null
  }
}

export function prefillDesdeDiagnostico(visita, formulario) {
  const produccionActual = String(visita?.f32_cant_producida_2024_e1 ?? '').trim()
  const produccionAnterior = String(visita?.f31_cant_producida_2023_e1 ?? '').trim()
  const f = { ...formulario, rubros_principales: 'Apicultura',
    descripcion_produccion: produccionActual || produccionAnterior }
  if (!f.agencia_area) f.agencia_area = 'Agencia Santa Barbara'
  if (visita) {
    if (!f.antecedentes_usuario) {
      const anios = String(visita.asb_anios_apicultura || '').trim() || 'XX'
      f.antecedentes_usuario = `Apicultor con ${anios} años en el rubro apicola, actualmente perteneciente al programa de alianzas productivas Indap-Apicola Santa Barbara.`
    }
    if (!f.identificacion_predio) {
      const dirPredio = visita.f10_dir_predio || visita.f9_dir_propiedad
      if (dirPredio) f.identificacion_predio = dirPredio
    }
  }
  return f
}

function MontoInput({ name, value, onChange, disabled, placeholder = '0' }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
      <input
        name={name}
        value={formatMiles(value)}
        onChange={e => onChange(name, parseMonto(e.target.value))}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        className="input-field w-full pl-7 text-right"
      />
    </div>
  )
}

function TextoLargo({ label, nota, value, onChange, disabled, rows = 3 }) {
  return (
    <div>
      <label className="label text-xs font-medium text-gray-700">{label}</label>
      {nota && <p className="text-[11px] text-gray-400 italic mb-1">{nota}</p>}
      <VoiceInput value={value} onChange={onChange} disabled={disabled} rows={rows}
        placeholder="Escribe o dicta aquí…" />
    </div>
  )
}

export default function ProyectoInversion() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin'
  const puedeVer = isAdmin || !!user?.puede_ver_proyectos_inversion
  const puedeEditar = isAdmin || !!user?.puede_editar_proyectos_inversion
  const soloLectura = !puedeEditar

  const anioQuery = Number(searchParams.get('anio'))
  const anioInicial = ANIOS_PROYECTO.includes(anioQuery) ? anioQuery : 2026
  const [form, setForm] = useState({ ...EMPTY, anio: anioInicial })
  const [savedId, setSavedId] = useState(id || null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!!id)

  const [apiResults, setApiResults] = useState([])
  const [showApi, setShowApi] = useState(false)
  const [apiLoading, setApiLoading] = useState(false)
  const skipApiSearch = useRef(false)
  const proporcionesTotal = useRef(null)

  const montoIndap = parseMonto(form.monto_indap)
  const montoPropio = parseMonto(form.monto_propio)
  const montoCredito = form.solicita_credito ? parseMonto(form.monto_credito) : 0
  const montoValorizado = form.aporte_valorizado ? parseMonto(form.monto_valorizado) : 0
  const montoTotal = montoIndap + montoPropio + montoCredito + montoValorizado
  const excedeIndap = montoIndap > MAX_APORTE_INDAP
  const pctAporte = porcentajeAporte({ montoIndap, montoPropio, montoCredito, montoValorizado })
  const aporteInsuficiente = montoTotal > 0 && pctAporte < PORCENTAJE_MINIMO_APORTE
  const pctValorizado = montoTotal > 0 ? (montoValorizado / montoTotal) * 100 : 0
  const valorizadoExcesivo = montoValorizado > montoTotal * 0.4

  useEffect(() => {
    if (!id || !puedeVer) return
    let active = true
    ;(async () => {
      try {
        const p = await getProyecto(id)
        if (!active) return
        skipApiSearch.current = true
        // Migración de formato antiguo: detalle_proyecto → descripción
        const formulario = { ...EMPTY_FORMULARIO, ...(p.formulario || {}) }
        if (!p.formulario && p.detalle_proyecto) formulario.descripcion = p.detalle_proyecto
        const visita = await obtenerDiagnostico({ rut: p.apicultor_rut, nombre: p.apicultor_nombre })
        if (!active) return
        const formularioCompleto = prefillDesdeDiagnostico(visita, formulario)
        setForm({
          ...EMPTY,
          ...p,
          anio: ANIOS_PROYECTO.includes(Number(p.anio)) ? Number(p.anio) : 2026,
          apicultor_rut: p.apicultor_rut || '',
          apicultor_telefono: p.apicultor_telefono || '',
          apicultor_comuna: p.apicultor_comuna || '',
          apicultor_direccion: p.apicultor_direccion || '',
          apicultor_email: p.apicultor_email || '',
          detalle_proyecto: p.detalle_proyecto || '',
          formulario: formularioCompleto,
        })
      } catch (e) {
        if (active) setError(e.message)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [id, puedeVer])

  useEffect(() => {
    if (skipApiSearch.current) { skipApiSearch.current = false; return }
    const q = form.apicultor_nombre || ''
    if (q.length < 4) {
      setApiResults([])
      setShowApi(false)
      return
    }
    const timer = setTimeout(async () => {
      setApiLoading(true)
      try {
        const results = await buscarApicultoresPorNombre(q)
        setApiResults(results)
        setShowApi(results.length > 0)
      } catch (e) {
        console.error('Error buscando apicultores:', e)
      } finally {
        setApiLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [form.apicultor_nombre])

  function set(name, value) {
    setForm(f => ({ ...f, [name]: value }))
    setSaved(false)
  }

  function setF(name, value) {
    setForm(f => ({ ...f, formulario: { ...f.formulario, [name]: value } }))
    setSaved(false)
  }

  function handleChange(e) {
    set(e.target.name, e.target.value)
  }

  async function seleccionarApicultor(a) {
    const nombre = (a.nombre_completo || `${a.nombres || ''} ${a.apellidos || ''}`).trim()
    skipApiSearch.current = true
    const visita = await obtenerDiagnostico({ rut: a.rut, nombre })
    setForm(prev => ({
      ...prev,
      apicultor_nombre: nombre,
      apicultor_rut: a.rut || '',
      apicultor_telefono: a.telefono || '',
      apicultor_comuna: a.comuna || '',
      apicultor_direccion: a.direccion || '',
      apicultor_email: a.email || '',
      formulario: prefillDesdeDiagnostico(visita, prev.formulario),
    }))
    setApiResults([])
    setShowApi(false)
    setSaved(false)
  }

  // ── Carta Gantt ──
  function agregarActividad() {
    setForm(f => ({
      ...f,
      formulario: {
        ...f.formulario,
        gantt: [...(f.formulario.gantt || []), { actividad: '', semanas: Array(SEMANAS).fill(false) }],
      },
    }))
    setSaved(false)
  }

  function setActividad(i, valor) {
    setForm(f => {
      const gantt = [...(f.formulario.gantt || [])]
      gantt[i] = { ...gantt[i], actividad: valor }
      return { ...f, formulario: { ...f.formulario, gantt } }
    })
    setSaved(false)
  }

  function toggleSemana(i, semana) {
    setForm(f => {
      const gantt = [...(f.formulario.gantt || [])]
      const semanas = [...(gantt[i].semanas || Array(SEMANAS).fill(false))]
      semanas[semana] = !semanas[semana]
      gantt[i] = { ...gantt[i], semanas }
      return { ...f, formulario: { ...f.formulario, gantt } }
    })
    setSaved(false)
  }

  function quitarActividad(i) {
    setForm(f => ({
      ...f,
      formulario: { ...f.formulario, gantt: (f.formulario.gantt || []).filter((_, j) => j !== i) },
    }))
    setSaved(false)
  }

  // ── Ítems de inversión ──
  function agregarItem() {
    setForm(f => ({
      ...f,
      formulario: {
        ...f.formulario,
        inversion_items: [...(f.formulario.inversion_items || []),
          { tipo: TIPOS_INVERSION[0], item: '', producto: '', unidad: '', medida: '', precio_unitario: '', monto: '' }],
      },
    }))
    setSaved(false)
  }

  function setItem(i, campo, valor) {
    setForm(f => {
      const inversion_items = [...(f.formulario.inversion_items || [])]
      const item = { ...inversion_items[i], [campo]: valor }
      if (campo === 'precio_unitario' || campo === 'medida') {
        const cant = parseFloat(String(item.medida).replace(',', '.')) || 0
        const precio = parseMonto(item.precio_unitario)
        if (cant > 0 && precio > 0) item.monto = cant * precio
      }
      inversion_items[i] = item
      return { ...f, formulario: { ...f.formulario, inversion_items } }
    })
    setSaved(false)
  }

  function quitarItem(i) {
    setForm(f => ({
      ...f,
      formulario: { ...f.formulario, inversion_items: (f.formulario.inversion_items || []).filter((_, j) => j !== i) },
    }))
    setSaved(false)
  }

  function cargarPlano(file) {
    if (soloLectura || !file) return
    const esPdf = file.type === 'application/pdf' || (!file.type && /\.pdf$/i.test(file.name))
    if (!esPdf && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return alert('Selecciona un archivo PDF o una imagen JPG, PNG o WebP')
    }
    if (file.size > 10 * 1024 * 1024) return alert('El archivo no puede superar los 10 MB')
    const reader = new FileReader()
    reader.onerror = () => alert('No se pudo leer el archivo. Intenta nuevamente.')
    reader.onload = ev => {
      if (esPdf) {
        setForm(prev => ({ ...prev, formulario: { ...prev.formulario,
          plano: `data:application/pdf;base64,${String(ev.target.result).split(',')[1]}`,
          plano_nombre: file.name } }))
        setSaved(false)
        return
      }
      const img = new Image()
      img.onerror = () => alert('No se pudo abrir la imagen. Selecciona otra.')
      img.onload = () => {
        const MAX = 1800
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        setF('plano', canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  const gantt = form.formulario?.gantt || []
  const items = form.formulario?.inversion_items || []
  const sumaItems = items.reduce((total, item) => total + parseMonto(item.monto), 0)
  const diferenciaItems = sumaItems - montoTotal

  async function guardar(andClose = false) {
    if (soloLectura) return
    if (!form.apicultor_nombre.trim()) return alert('Selecciona o escribe el nombre del postulante')
    if (!form.nombre_proyecto.trim()) return alert('El nombre del proyecto de inversión es obligatorio')
    if (excedeIndap) {
      return alert(`El Aporte Indap no puede superar ${formatPesos(MAX_APORTE_INDAP)} (máximo 3,5 millones).`)
    }
    if (aporteInsuficiente) {
      const seguir = confirm(
        `El aporte del usuario es ${pctAporte.toFixed(1)}% del total del proyecto, menor al mínimo de ${PORCENTAJE_MINIMO_APORTE}%. ¿Deseas guardar de todas formas?`
      )
      if (!seguir) return
    }
    if (valorizadoExcesivo && !confirm(`El aporte valorizado es ${pctValorizado.toFixed(1)}% del total del proyecto y supera el máximo de 40%. ¿Deseas guardar de todas formas?`)) return
    if (saving) return
    setSaving(true)
    setError('')
    try {
      if (savedId) {
        await editarProyecto(savedId, form)
      } else {
        const nuevo = await crearProyecto(form, user?.nombre)
        setSavedId(nuevo.id)
      }
      setSaved(true)
      if (andClose) {
        const anio = ANIOS_PROYECTO.includes(Number(form.anio)) ? Number(form.anio) : 2026
        setTimeout(() => navigate(`/proyectos-inversion/anio/${anio}`), 900)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
  }

  function datosFormulario() {
    return { ...form, monto_total: montoTotal }
  }

  if (!puedeVer) {
    return (
      <div className="p-4">
        <div className="card bg-red-50 border-red-200 text-red-700 text-sm">
          No tienes permisos para ver los proyectos de inversión. Solicita el acceso al administrador.
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="p-6 flex items-center gap-2 text-gray-500 text-sm">
      <Loader2 className="w-4 h-4 animate-spin" /> Cargando proyecto…
    </div>
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => navigate(-1)} className="p-1 rounded-lg hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-amber-500" />
          {id ? 'Editar' : 'Nuevo'} Proyecto de Inversión
        </h2>
      </div>

      <div className="card bg-emerald-50 border-emerald-200 text-emerald-800 text-xs">
        <strong>FORMULARIO DE POSTULACIÓN (FORMATO OBLIGATORIO)</strong><br />
        CONCURSO PDI ALIANZAS PRODUCTIVAS AÑO {form.anio}
      </div>

      {soloLectura && (
        <div className="card bg-amber-50 border-amber-200 text-amber-700 text-sm">
          Sólo lectura: no tienes permiso para crear o editar proyectos de inversión.
        </div>
      )}

      <fieldset disabled={soloLectura} className="contents">

      {/* 1.- Portada del Proyecto */}
      <div className="card space-y-3">
        <h3 className="font-bold text-sm text-gray-700">1.- Portada del Proyecto</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs font-medium text-gray-700">Concurso PDI</label>
            <input value="PDI ALIANZAS PRODUCTIVAS" readOnly className="input-field w-full bg-gray-50" />
          </div>
          <div>
            <label className="label text-xs font-medium text-gray-700">Año del proyecto</label>
            <select name="anio" value={form.anio} onChange={e => set('anio', Number(e.target.value))}
              className="input-field w-full">
              {ANIOS_PROYECTO.map(anio => <option key={anio} value={anio}>{anio}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 relative">
            <label className="label text-xs font-medium text-gray-700">Nombre de postulante</label>
            <input name="apicultor_nombre" value={form.apicultor_nombre} onChange={handleChange}
              autoComplete="off" className="input-field w-full"
              placeholder="Busca en la lista de apicultores del programa…" />
            {apiLoading && <p className="text-xs text-gray-400 mt-1">Buscando…</p>}
            {showApi && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {apiResults.map(a => (
                  <button type="button" key={a.id} onClick={() => seleccionarApicultor(a)}
                    className="w-full text-left px-3 py-2 hover:bg-honey-50 flex items-center gap-2 border-b border-gray-50 last:border-0">
                    <User className="w-4 h-4 text-honey-600 flex-shrink-0" />
                    <span className="text-sm text-gray-800">
                      {(a.nombre_completo || `${a.nombres || ''} ${a.apellidos || ''}`).trim()}
                      {a.rut ? <span className="text-xs text-gray-500"> · {a.rut}</span> : null}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="label text-xs font-medium text-gray-700">RUT de postulante</label>
            <input name="apicultor_rut" value={form.apicultor_rut} onChange={handleChange}
              className="input-field w-full" placeholder="12.345.678-9" />
          </div>
          <div>
            <label className="label text-xs font-medium text-gray-700">Agencia de área</label>
            <input value={form.formulario.agencia_area}
              onChange={e => setF('agencia_area', e.target.value)}
              className="input-field w-full" placeholder="Ej: Agencia Santa Bárbara" />
          </div>
          <div className="sm:col-span-2">
            <label className="label text-xs font-medium text-gray-700">Comuna</label>
            <input name="apicultor_comuna" value={form.apicultor_comuna} onChange={handleChange}
              className="input-field w-full" placeholder="Comuna" />
          </div>
        </div>
      </div>

      {/* 2.- Información General del Proyecto */}
      <div className="card space-y-4">
        <h3 className="font-bold text-sm text-gray-700">2.- Información General del Proyecto</h3>
        <TextoLargo label="Antecedentes del usuario/a" value={form.formulario.antecedentes_usuario}
          onChange={v => setF('antecedentes_usuario', v)} disabled={soloLectura} />
        <TextoLargo label="Identificación del predio" value={form.formulario.identificacion_predio}
          onChange={v => setF('identificacion_predio', v)} disabled={soloLectura} />
        <TextoLargo label="Régimen de tenencia del predio" value={form.formulario.regimen_tenencia_predio}
          onChange={v => setF('regimen_tenencia_predio', v)} disabled={soloLectura} rows={2} />
        <TextoLargo label="Régimen de tenencia del agua" value={form.formulario.regimen_tenencia_agua}
          onChange={v => setF('regimen_tenencia_agua', v)} disabled={soloLectura} rows={2} />
        <div>
          <label className="label text-xs font-medium text-gray-700">Nombre del proyecto</label>
          <input name="nombre_proyecto" value={form.nombre_proyecto} onChange={handleChange}
            list="opciones-nombre-proyecto" className="input-field w-full"
            placeholder="Selecciona una opción o escribe otro nombre" />
          <datalist id="opciones-nombre-proyecto">
            {OPCIONES_NOMBRE_PROYECTO.map(o => <option key={o} value={o} />)}
          </datalist>
        </div>
        <TextoLargo label="Fundamentación del proyecto" nota="Es el Por qué"
          value={form.formulario.fundamentacion} onChange={v => setF('fundamentacion', v)} disabled={soloLectura} />
        <TextoLargo label="Objetivos del proyecto" nota="Es el Para qué"
          value={form.formulario.objetivos} onChange={v => setF('objetivos', v)} disabled={soloLectura} />
        <TextoLargo label="Descripción del proyecto" nota="Es el Qué"
          value={form.formulario.descripcion} onChange={v => setF('descripcion', v)} disabled={soloLectura} />
        <TextoLargo label="Impacto del proyecto"
          nota="Es el Qué cambio. Diferencia entre situación inicial (problema) y situación final (solución)"
          value={form.formulario.impacto} onChange={v => setF('impacto', v)} disabled={soloLectura} />
      </div>

      {/* 3.- Antecedentes Técnicos del Proyecto */}
      <div className="card space-y-4">
        <h3 className="font-bold text-sm text-gray-700">3.- Antecedentes Técnicos del Proyecto</h3>
        <TextoLargo label="Descripción del o los rubros principales que involucra el proyecto"
          value={form.formulario.rubros_principales} onChange={v => setF('rubros_principales', v)} disabled={soloLectura} />
        <TextoLargo label="Descripción de la producción"
          nota="¿Cuánto produce? ¿Cómo mejoraría la producción una vez incorporado el proyecto?"
          value={form.formulario.descripcion_produccion} onChange={v => setF('descripcion_produccion', v)} disabled={soloLectura} />
      </div>

      {/* 4.- Carta Gantt del Proyecto */}
      <div className="card space-y-3">
        <h3 className="font-bold text-sm text-gray-700">4.- Carta Gantt del Proyecto</h3>
        <p className="text-[11px] text-gray-400">
          Actividades en la ejecución de las inversiones — periodo de ejecución: 45 días / 6 semanas
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-2 py-1 text-left text-xs">Actividad</th>
                {Array.from({ length: SEMANAS }, (_, i) => (
                  <th key={i} className="border border-gray-300 bg-gray-50 px-2 py-1 text-xs w-10">{i + 1}</th>
                ))}
                {puedeEditar && <th className="w-8"></th>}
              </tr>
            </thead>
            <tbody>
              {gantt.map((a, i) => (
                <tr key={i}>
                  <td className="border border-gray-300 p-0">
                    <input value={a.actividad} onChange={e => setActividad(i, e.target.value)}
                      className="w-full px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                      placeholder="Nombre de la actividad" />
                  </td>
                  {Array.from({ length: SEMANAS }, (_, s) => (
                    <td key={s} className="border border-gray-300 text-center p-0">
                      <button type="button" onClick={() => toggleSemana(i, s)}
                        className={`w-full h-8 ${a.semanas?.[s] ? 'bg-emerald-500' : 'bg-white hover:bg-gray-50'}`}
                        disabled={soloLectura} />
                    </td>
                  ))}
                  {puedeEditar && (
                    <td className="text-center">
                      <button type="button" onClick={() => quitarActividad(i)}
                        className="p-1 text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {gantt.length === 0 && (
                <tr><td colSpan={SEMANAS + 2} className="border border-gray-300 px-3 py-3 text-xs text-gray-400 text-center">
                  Sin actividades — agrega la primera con el botón de abajo
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {puedeEditar && (
          <button type="button" onClick={agregarActividad}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold px-4 py-2 rounded-lg text-sm">
            <Plus className="w-4 h-4" /> Agregar actividad
          </button>
        )}
      </div>

      {/* 5.- Montos del Proyecto */}
      <div className="card space-y-3">
        <h3 className="font-bold text-sm text-gray-700">5.- Montos del Proyecto</h3>
        <p className="text-xs font-semibold text-gray-600">Inversiones del Proyecto</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {['Tipo de Inversión', 'Ítem', 'Producto', 'Unidad', 'Medida', 'Precio unitario', 'Monto total'].map(h => (
                  <th key={h} className="border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-left">{h}</th>
                ))}
                {puedeEditar && <th className="w-8"></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td className="border border-gray-300 p-0">
                    <select value={it.tipo} onChange={e => setItem(i, 'tipo', e.target.value)}
                      className="w-full px-1 py-1.5 text-sm focus:outline-none">
                      {TIPOS_INVERSION.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="border border-gray-300 p-0">
                    <input value={it.item} onChange={e => setItem(i, 'item', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm focus:outline-none" placeholder="Infraestructura" />
                  </td>
                  <td className="border border-gray-300 p-0">
                    <input value={it.producto} onChange={e => setItem(i, 'producto', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm focus:outline-none" />
                  </td>
                  <td className="border border-gray-300 p-0">
                    <input value={it.unidad} onChange={e => setItem(i, 'unidad', e.target.value)}
                      className="w-16 px-2 py-1.5 text-sm focus:outline-none" placeholder="unidad" />
                  </td>
                  <td className="border border-gray-300 p-0">
                    <input value={it.medida} onChange={e => setItem(i, 'medida', e.target.value)}
                      className="w-16 px-2 py-1.5 text-sm focus:outline-none text-right" inputMode="decimal" />
                  </td>
                  <td className="border border-gray-300 p-0">
                    <input value={formatMiles(it.precio_unitario)}
                      onChange={e => setItem(i, 'precio_unitario', parseMonto(e.target.value))}
                      className="w-24 px-2 py-1.5 text-sm focus:outline-none text-right" inputMode="numeric" />
                  </td>
                  <td className="border border-gray-300 p-0">
                    <input value={formatMiles(it.monto)}
                      onChange={e => setItem(i, 'monto', parseMonto(e.target.value))}
                      className="w-24 px-2 py-1.5 text-sm focus:outline-none text-right font-medium" inputMode="numeric" />
                  </td>
                  {puedeEditar && (
                    <td className="text-center">
                      <button type="button" onClick={() => quitarItem(i)}
                        className="p-1 text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8} className="border border-gray-300 px-3 py-3 text-xs text-gray-400 text-center">
                  Sin ítems de inversión — agrega el primero con el botón de abajo
                </td></tr>
              )}
            </tbody>
            <tfoot className="no-print print:hidden">
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={6} className="border border-gray-300 px-2 py-2 text-right text-xs">Suma de ítems (solo referencia)</td>
                <td className="border border-gray-300 px-2 py-2 text-right text-sm whitespace-nowrap">{formatPesos(sumaItems)}</td>
                {puedeEditar && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
        {diferenciaItems !== 0 && (
          <div role="alert" className="no-print print:hidden flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>La suma de los ítems ({formatPesos(sumaItems)}) no coincide con el total del proyecto ({formatPesos(montoTotal)}).
              {' '}{diferenciaItems > 0 ? 'Excede el total en' : 'Faltan'} {formatPesos(Math.abs(diferenciaItems))}. Solo comparación; no modifica los montos.</span>
          </div>
        )}
        {puedeEditar && (
          <button type="button" onClick={agregarItem}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold px-4 py-2 rounded-lg text-sm">
            <Plus className="w-4 h-4" /> Agregar ítem de inversión
          </button>
        )}
      </div>

      {/* Financiamiento del Proyecto */}
      <div className="card space-y-3">
        <h3 className="font-bold text-sm text-gray-700">Financiamiento del Proyecto</h3>
        {form.aporte_valorizado && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Proyecto con aporte valorizado de {formatPesos(montoValorizado)}: recuerda considerarlo en el aporte propio.</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs font-medium text-gray-700">Incentivo INDAP ($)</label>
            <MontoInput name="monto_indap" value={form.monto_indap} onChange={set} />
            <p className={`text-[11px] mt-1 ${excedeIndap ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
              Máximo 3,5 millones de aporte
            </p>
            {excedeIndap && (
              <p className="text-[11px] text-red-600 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3" />
                El aporte excede el máximo de {formatPesos(MAX_APORTE_INDAP)}
              </p>
            )}
          </div>

          <div>
            <label className="label text-xs font-medium text-gray-700">Aporte propio usuario ($)</label>
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <MontoInput name="monto_propio" value={form.monto_propio} onChange={set} />
              </div>
              <span className={`text-[11px] pt-2.5 whitespace-nowrap ${aporteInsuficiente ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                {montoTotal > 0 ? `${pctAporte.toFixed(1)}% del total del proyecto` : '— % del total'}
              </span>
            </div>
            <p className={`text-[11px] mt-1 ${aporteInsuficiente ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
              {aporteInsuficiente ? 'Alerta: el aporte del usuario es menor al 30% del total del proyecto.' : 'Mínimo 30% del total del proyecto (propio + crédito + valorizado).'}
            </p>
            <label className="flex items-center gap-2 text-xs text-gray-700 mt-2">
              <input type="checkbox" checked={!!form.aporte_valorizado}
                onChange={e => {
                  set('aporte_valorizado', e.target.checked)
                  if (!e.target.checked) set('monto_valorizado', '')
                }} />
              Aporte valorizado (solo cuando es construcción)
            </label>
            {form.aporte_valorizado && (
              <div className="mt-2">
                <MontoInput name="monto_valorizado" value={form.monto_valorizado} onChange={set} />
                <p role={valorizadoExcesivo ? 'alert' : undefined} className={`text-[11px] mt-1 ${valorizadoExcesivo ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                  {valorizadoExcesivo ? 'Alerta: el aporte valorizado supera el 40% del total del proyecto. ' : 'Máximo 40% del total del proyecto. '}
                  Actual: {pctValorizado.toFixed(1)}%.
                </p>
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="label text-xs font-medium text-gray-700">Solicita Crédito Indap</label>
            <div className="flex items-center gap-4 mt-1">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" name="solicita_credito" checked={form.solicita_credito === true}
                  onChange={() => set('solicita_credito', true)} /> SI
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" name="solicita_credito" checked={form.solicita_credito === false}
                  onChange={() => { set('solicita_credito', false); set('monto_credito', '') }} /> NO
              </label>
            </div>
          </div>

          {form.solicita_credito && (
            <div>
              <label className="label text-xs font-medium text-gray-700">Crédito Indap</label>
              <MontoInput name="monto_credito" value={form.monto_credito} onChange={set} />
              <p className="text-[11px] text-gray-400 mt-1">Se suma al aporte propio para calcular el porcentaje</p>
            </div>
          )}

          <div className={form.solicita_credito ? '' : 'sm:col-span-2'}>
            <label className="label text-xs font-medium text-gray-700">Monto total Inversión ($)</label>
            <input value={formatMiles(montoTotal)} inputMode="numeric"
              onFocus={() => { proporcionesTotal.current = form }}
              onBlur={() => { proporcionesTotal.current = null }}
              onChange={e => {
                const montos = distribuirTotalProyecto(proporcionesTotal.current || form, e.target.value)
                setForm(prev => ({ ...prev, ...montos }))
                setSaved(false)
              }}
              className="input-field w-full text-right font-semibold" />
            <p className="text-[11px] text-gray-500 mt-1">
              Total del proyecto: 100%. Al editarlo se mantienen las proporciones actuales de cada aporte.
              Si no hay montos, se distribuye 70% INDAP y 30% usuario.
            </p>
            <p className="text-xs text-gray-700 mt-1">
              INDAP: {montoTotal > 0 ? ((montoIndap / montoTotal) * 100).toFixed(1) : '0.0'}% · Usuario: {pctAporte.toFixed(1)}% del total.
            </p>
          </div>
        </div>
      </div>

      {/* Firmas */}
      <div className="card space-y-3">
        <h3 className="font-bold text-sm text-gray-700">Firmas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs font-medium text-gray-700">Nombre y apellidos de postulante</label>
            <input value={form.apicultor_nombre} readOnly className="input-field w-full bg-gray-50" />
            <p className="text-[11px] text-gray-400 mt-1">Se toma automáticamente del postulante</p>
          </div>
          <div>
            <label className="label text-xs font-medium text-gray-700">Nombre y apellidos Formulador de la postulación</label>
            <input value={form.formulario.formulador}
              onChange={e => setF('formulador', e.target.value)}
              className="input-field w-full" placeholder="Quien llenó este formulario" />
          </div>
        </div>
      </div>

      {/* Plano de la construcción */}
      <div className="card space-y-3">
        <h3 className="font-bold text-sm text-gray-700">Plano de la construcción</h3>
        {form.formulario.plano ? (
          <div className="space-y-2">
            {form.formulario.plano.startsWith('data:application/pdf;') ? (
              <div className="rounded-lg border border-gray-200 p-4 space-y-2">
                <p className="text-sm font-medium">{form.formulario.plano_nombre || 'Plano PDF'}</p>
                <a href={form.formulario.plano} download={form.formulario.plano_nombre || 'plano.pdf'}
                  className="text-sm text-emerald-700 underline">Descargar PDF para abrir o imprimir</a>
                <p className="text-xs text-gray-500">El PDF se conserva como adjunto y se imprime por separado del formulario.</p>
              </div>
            ) : (
              <img src={form.formulario.plano} alt="Plano de la construcción"
                className="max-h-80 w-auto rounded-lg border border-gray-200" />
            )}
            {puedeEditar && (
              <button type="button" onClick={() => setF('plano', '')}
                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700">
                <Trash2 className="w-4 h-4" /> Quitar plano
              </button>
            )}
          </div>
        ) : puedeEditar ? (
          <label onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
            onDrop={e => {
              e.preventDefault()
              if (e.dataTransfer.files.length !== 1) return alert('Adjunta un solo archivo de plano')
              cargarPlano(e.dataTransfer.files[0])
            }}
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl px-4 py-8 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors">
            <Plus className="w-6 h-6 text-gray-400" />
            <span className="text-sm text-gray-500">Arrastra el plano aquí o haz clic para seleccionar un archivo</span>
            <span className="text-xs text-gray-400">PDF, JPG, PNG o WebP · Máximo 10 MB</span>
            <input type="file" accept="application/pdf,.pdf,image/jpeg,image/png,image/webp" onChange={e => {
              cargarPlano(e.target.files?.[0])
              e.target.value = ''
            }} className="sr-only" />
          </label>
        ) : (
          <p className="text-xs text-gray-400">Sin plano adjunto</p>
        )}
      </div>

      </fieldset>

      {error && (
        <div className="card bg-red-50 border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {saved && (
        <div className="card bg-green-50 border-green-200 text-green-700 text-sm font-medium">
          ✓ Proyecto de inversión guardado
        </div>
      )}

      <div className={`flex flex-wrap gap-2 ${puedeEditar ? '' : 'hidden'}`}>
        <button type="button" onClick={() => guardar(false)} disabled={saving}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 bg-amber-100 text-amber-700 hover:bg-amber-200 font-semibold py-3 rounded-lg transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" onClick={() => guardar(true)} disabled={saving}
          className="flex-1 min-w-[120px] btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50">
          <Save className="w-4 h-4" /> Guardar y cerrar
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => descargarWord(datosFormulario())}
          className="flex-1 min-w-[150px] flex items-center justify-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold py-3 rounded-lg transition-colors">
          <FileDown className="w-4 h-4" /> Exportar a Word
        </button>
        <button type="button" onClick={() => imprimirFormulario(datosFormulario())}
          className="flex-1 min-w-[150px] flex items-center justify-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold py-3 rounded-lg transition-colors">
          <Printer className="w-4 h-4" /> Imprimir formulario
        </button>
      </div>
    </form>
  )
}
