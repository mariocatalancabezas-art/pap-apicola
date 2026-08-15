import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Save, ChevronLeft, Briefcase, User, AlertTriangle, FileText, Image as ImageIcon,
  Upload, Camera, Download, Trash2, Loader2,
} from 'lucide-react'
import { buscarApicultoresPorNombre } from '../lib/importApicultores'
import VoiceInput from '../components/VoiceInput'
import CameraCapture from '../components/CameraCapture'
import { useAuth } from '../lib/AuthContext'
import {
  MAX_APORTE_INDAP, PORCENTAJE_MINIMO_APORTE,
  crearProyecto, editarProyecto, getProyecto,
  listArchivos, subirArchivo, eliminarArchivo, descargarArchivo,
  formatMiles, formatPesos, parseMonto, porcentajeAporte,
} from '../lib/proyectosInversion'

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
  solicita_credito: false,
  monto_credito: '',
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

export default function ProyectoInversion() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const puedeEditar = user?.rol === 'admin' || !!user?.puede_editar

  const [form, setForm] = useState({ ...EMPTY })
  const [savedId, setSavedId] = useState(id || null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!!id)

  const [apiResults, setApiResults] = useState([])
  const [showApi, setShowApi] = useState(false)
  const [apiLoading, setApiLoading] = useState(false)
  const skipApiSearch = useRef(false)

  const [archivos, setArchivos] = useState([])
  const [subiendo, setSubiendo] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const cotizacionInput = useRef(null)
  const fotoInput = useRef(null)

  const montoIndap = parseMonto(form.monto_indap)
  const montoPropio = parseMonto(form.monto_propio)
  const montoCredito = form.solicita_credito ? parseMonto(form.monto_credito) : 0
  const montoTotal = montoIndap + montoPropio + montoCredito
  const excedeIndap = montoIndap > MAX_APORTE_INDAP
  const pctAporte = porcentajeAporte({ montoIndap, montoPropio, montoCredito })
  const aporteInsuficiente = montoIndap > 0 && pctAporte < PORCENTAJE_MINIMO_APORTE

  useEffect(() => {
    if (!id) return
    let active = true
    ;(async () => {
      try {
        const p = await getProyecto(id)
        if (!active) return
        skipApiSearch.current = true
        setForm({
          ...EMPTY,
          ...p,
          apicultor_rut: p.apicultor_rut || '',
          apicultor_telefono: p.apicultor_telefono || '',
          apicultor_comuna: p.apicultor_comuna || '',
          apicultor_direccion: p.apicultor_direccion || '',
          apicultor_email: p.apicultor_email || '',
          detalle_proyecto: p.detalle_proyecto || '',
        })
      } catch (e) {
        if (active) setError(e.message)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [id])

  useEffect(() => {
    if (!savedId) return
    let active = true
    ;(async () => {
      try {
        const list = await listArchivos(savedId)
        if (active) setArchivos(list)
      } catch (e) {
        if (active) setError(e.message)
      }
    })()
    return () => { active = false }
  }, [savedId])

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

  function handleChange(e) {
    set(e.target.name, e.target.value)
  }

  function seleccionarApicultor(a) {
    const nombre = (a.nombre_completo || `${a.nombres || ''} ${a.apellidos || ''}`).trim()
    skipApiSearch.current = true
    setForm(prev => ({
      ...prev,
      apicultor_nombre: nombre,
      apicultor_rut: a.rut || '',
      apicultor_telefono: a.telefono || '',
      apicultor_comuna: a.comuna || '',
      apicultor_direccion: a.direccion || '',
      apicultor_email: a.email || '',
    }))
    setApiResults([])
    setShowApi(false)
    setSaved(false)
  }

  async function guardar(andClose = false) {
    if (!form.apicultor_nombre.trim()) return alert('Selecciona o escribe el nombre del apicultor')
    if (!form.nombre_proyecto.trim()) return alert('El nombre del proyecto de inversión es obligatorio')
    if (excedeIndap) {
      return alert(`El Aporte Indap no puede superar ${formatPesos(MAX_APORTE_INDAP)} (máximo 3,5 millones).`)
    }
    if (aporteInsuficiente) {
      const seguir = confirm(
        `El aporte del usuario es ${pctAporte.toFixed(1)}% del Aporte Indap, menor al mínimo de ${PORCENTAJE_MINIMO_APORTE}%. ¿Deseas guardar de todas formas?`
      )
      if (!seguir) return
    }
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
      if (andClose) setTimeout(() => navigate('/proyectos-inversion'), 900)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    guardar(true)
  }

  async function adjuntar(files, tipo) {
    if (!files || files.length === 0) return
    if (!savedId) {
      alert('Guarda primero el proyecto para poder adjuntar archivos.')
      return
    }
    setSubiendo(true)
    setError('')
    try {
      for (const file of Array.from(files)) {
        if (tipo === 'cotizacion' && file.type !== 'application/pdf') {
          throw new Error(`"${file.name}" no es un PDF. Las cotizaciones deben estar en formato PDF.`)
        }
        await subirArchivo(savedId, file, tipo)
      }
      setArchivos(await listArchivos(savedId))
    } catch (e) {
      setError(e.message)
    } finally {
      setSubiendo(false)
    }
  }

  async function quitarArchivo(archivo) {
    if (!confirm(`¿Eliminar "${archivo.nombre}"?`)) return
    setError('')
    try {
      await eliminarArchivo(archivo)
      setArchivos(await listArchivos(savedId))
    } catch (e) {
      setError(e.message)
    }
  }

  async function bajarArchivo(archivo) {
    setError('')
    try {
      await descargarArchivo(archivo)
    } catch (e) {
      setError(e.message)
    }
  }

  function ListaArchivos({ tipo, vacio }) {
    const items = archivos.filter(a => a.tipo === tipo)
    if (items.length === 0) return <p className="text-xs text-gray-400">{vacio}</p>
    return (
      <ul className="space-y-1">
        {items.map(a => (
          <li key={a.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
            {tipo === 'cotizacion'
              ? <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
              : <ImageIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />}
            <span className="text-sm text-gray-700 truncate flex-1">{a.nombre}</span>
            <button type="button" onClick={() => bajarArchivo(a)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200" title="Descargar">
              <Download className="w-4 h-4" />
            </button>
            {puedeEditar && (
              <button type="button" onClick={() => quitarArchivo(a)}
                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50" title="Eliminar">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
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

      {/* Datos del apicultor */}
      <div className="card space-y-3">
        <h3 className="font-bold text-sm text-gray-700">Datos del Apicultor</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 relative">
            <label className="label text-xs font-medium text-gray-700">Nombre completo</label>
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
            <label className="label text-xs font-medium text-gray-700">RUT</label>
            <input name="apicultor_rut" value={form.apicultor_rut} onChange={handleChange}
              className="input-field w-full" placeholder="12.345.678-9" />
          </div>
          <div>
            <label className="label text-xs font-medium text-gray-700">Teléfono</label>
            <input name="apicultor_telefono" value={form.apicultor_telefono} onChange={handleChange}
              className="input-field w-full" placeholder="+56 9 ..." />
          </div>
          <div>
            <label className="label text-xs font-medium text-gray-700">Dirección/sector</label>
            <input name="apicultor_direccion" value={form.apicultor_direccion} onChange={handleChange}
              className="input-field w-full" placeholder="Dirección o sector" />
          </div>
          <div>
            <label className="label text-xs font-medium text-gray-700">Comuna</label>
            <input name="apicultor_comuna" value={form.apicultor_comuna} onChange={handleChange}
              className="input-field w-full" placeholder="Comuna" />
          </div>
          <div className="sm:col-span-2">
            <label className="label text-xs font-medium text-gray-700">Correo electrónico</label>
            <input type="email" name="apicultor_email" value={form.apicultor_email} onChange={handleChange}
              className="input-field w-full" placeholder="correo@ejemplo.cl" />
          </div>
        </div>
      </div>

      {/* Proyecto de inversión */}
      <div className="card space-y-3">
        <h3 className="font-bold text-sm text-gray-700">Proyecto de Inversión</h3>

        <div>
          <label className="label text-xs font-medium text-gray-700">Nombre del proyecto de inversión</label>
          <input name="nombre_proyecto" value={form.nombre_proyecto} onChange={handleChange}
            className="input-field w-full" placeholder="Sala de extracción" />
        </div>

        <div>
          <label className="label text-xs font-medium text-gray-700">Detalle proyecto</label>
          <VoiceInput value={form.detalle_proyecto} onChange={val => set('detalle_proyecto', val)}
            rows={5} placeholder="Describe el proyecto de inversión (escribe o dicta)…" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs font-medium text-gray-700">Monto Aporte Indap</label>
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
            <label className="label text-xs font-medium text-gray-700">Aporte propio usuario</label>
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <MontoInput name="monto_propio" value={form.monto_propio} onChange={set} />
              </div>
              <span className={`text-[11px] pt-2.5 whitespace-nowrap ${aporteInsuficiente ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                {montoIndap > 0 ? `${pctAporte.toFixed(1)}% del Aporte Indap` : '— % Aporte Indap'}
              </span>
            </div>
            <p className={`text-[11px] mt-1 ${aporteInsuficiente ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
              Mínimo 30%, Aporte Indap
            </p>
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
            <label className="label text-xs font-medium text-gray-700">Monto total del proyecto</label>
            <input value={formatPesos(montoTotal)} readOnly
              className="input-field w-full text-right bg-gray-50 font-semibold" />
            <p className="text-[11px] text-gray-400 mt-1">Suma automática de los montos anteriores</p>
          </div>
        </div>
      </div>

      {/* Cotizaciones */}
      <div className="card space-y-3">
        <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
          <FileText className="w-4 h-4 text-red-500" /> Cotizaciones
        </h3>
        <p className="text-[11px] text-gray-400">Sólo archivos en formato PDF</p>
        <input ref={cotizacionInput} type="file" accept="application/pdf" multiple className="hidden"
          onChange={e => { adjuntar(e.target.files, 'cotizacion'); e.target.value = '' }} />
        <button type="button" onClick={() => cotizacionInput.current?.click()} disabled={subiendo}
          className="flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
          <Upload className="w-4 h-4" /> Adjuntar cotización (PDF)
        </button>
        {!savedId && <p className="text-[11px] text-amber-600">Guarda el proyecto para poder adjuntar archivos.</p>}
        <ListaArchivos tipo="cotizacion" vacio="Sin cotizaciones adjuntas." />
      </div>

      {/* Fotografías */}
      <div className="card space-y-3">
        <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-amber-500" /> Fotografías
        </h3>
        <input ref={fotoInput} type="file" multiple className="hidden"
          onChange={e => { adjuntar(e.target.files, 'fotografia'); e.target.value = '' }} />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowCamera(true)} disabled={subiendo}
            className="flex items-center gap-2 bg-amber-100 text-amber-700 hover:bg-amber-200 font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
            <Camera className="w-4 h-4" /> Tomar fotografía
          </button>
          <button type="button" onClick={() => fotoInput.current?.click()} disabled={subiendo}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
            <Upload className="w-4 h-4" /> Subir archivos
          </button>
        </div>
        {!savedId && <p className="text-[11px] text-amber-600">Guarda el proyecto para poder adjuntar archivos.</p>}
        <ListaArchivos tipo="fotografia" vacio="Sin fotografías adjuntas." />
      </div>

      {subiendo && (
        <div className="card flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" /> Subiendo archivos…
        </div>
      )}

      {error && (
        <div className="card bg-red-50 border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {saved && (
        <div className="card bg-green-50 border-green-200 text-green-700 text-sm font-medium">
          ✓ Proyecto de inversión guardado
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => guardar(false)} disabled={saving}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 bg-amber-100 text-amber-700 hover:bg-amber-200 font-semibold py-3 rounded-lg transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 min-w-[120px] btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50">
          <Save className="w-4 h-4" /> Guardar y cerrar
        </button>
      </div>

      {showCamera && (
        <CameraCapture
          onClose={() => setShowCamera(false)}
          onCapture={file => { setShowCamera(false); adjuntar([file], 'fotografia') }}
        />
      )}
    </form>
  )
}
