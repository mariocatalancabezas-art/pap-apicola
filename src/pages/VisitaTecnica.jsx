import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, ChevronLeft, Stethoscope, User } from 'lucide-react'
import { db, SYNC_STATUS, generateUUID } from '../lib/db'
import { syncAll } from '../lib/sync'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useAuth } from '../lib/AuthContext'
import { buscarApicultoresPorNombre, buscarEquipoTecnicoPorNombre } from '../lib/importApicultores'

const EMPTY = {
  vt_nombre_tecnico: '',
  vt_fecha_visita: new Date().toISOString().slice(0, 10),
  f1_nombre: '',
  f3_rut: '',
  f4_telefono: '',
  f5_email: '',
  f9_dir_propiedad: '',
  f7_comuna: '',
  vt_nombre_apiario: '',
  vt_num_colmenas: '',
  vt_actividad_principal: '',
  vt_varroa_pct: '',
  vt_enfermedades: '',
  vt_tratamientos: '',
  vt_fecha_ultimo_tratamiento: '',
  vt_prod_anterior: '',
  vt_prod_estimada: '',
  vt_tipo_miel: '',
  vt_alimentacion: '',
  vt_renovacion_reinas: '',
  vt_recambio_marcos: '',
  vt_calendario_manejo: '',
  vt_problemas: '',
  vt_recomendaciones: '',
  vt_compromisos: '',
  vt_fecha_proxima_visita: '',
  vt_informe: '',
  vt_firma_tecnico: '',
  vt_firma_apicultor: '',
}

function formatRut(raw) {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length === 0) return ''
  const dv = clean.slice(-1)
  const num = clean.slice(0, -1)
  if (num.length === 0) return dv
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv
}

export default function VisitaTecnica() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isOnline = useOnlineStatus()
  const { user } = useAuth()
  const puedeEditar = user?.rol === 'admin' || user?.puede_editar

  const [form, setForm] = useState({ ...EMPTY })
  const [savedId, setSavedId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Autocomplete apicultor (campo Nombre completo)
  const [apiResults, setApiResults] = useState([])
  const [showApi, setShowApi] = useState(false)
  const [apiLoading, setApiLoading] = useState(false)
  const skipApiSearch = useRef(false)

  // Autocomplete equipo técnico (campo Nombre Técnico)
  const [tecResults, setTecResults] = useState([])
  const [showTec, setShowTec] = useState(false)
  const [tecLoading, setTecLoading] = useState(false)
  const skipTecSearch = useRef(false)

  // Modo edición: cargar la visita existente y guardar en el mismo documento
  useEffect(() => {
    if (!id) return
    if (!puedeEditar) { navigate('/historial-visita-tecnica'); return }
    let active = true
    ;(async () => {
      const v = await db.visitas.get(Number(id))
      if (!active) return
      if (!v) { alert('Visita no encontrada'); navigate('/historial-visita-tecnica'); return }
      skipApiSearch.current = true
      skipTecSearch.current = true
      setForm({ ...EMPTY, ...v })
      setSavedId(v.id)
    })()
    return () => { active = false }
  }, [id, puedeEditar])

  useEffect(() => {
    if (skipApiSearch.current) { skipApiSearch.current = false; return }
    const q = form.f1_nombre || ''
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
      } catch (err) {
        console.error('Error buscando apicultores:', err)
      } finally {
        setApiLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [form.f1_nombre])

  useEffect(() => {
    if (skipTecSearch.current) { skipTecSearch.current = false; return }
    const q = form.vt_nombre_tecnico || ''
    if (q.length < 3) {
      setTecResults([])
      setShowTec(false)
      return
    }
    const timer = setTimeout(async () => {
      setTecLoading(true)
      try {
        const results = await buscarEquipoTecnicoPorNombre(q)
        setTecResults(results)
        setShowTec(results.length > 0)
      } catch (err) {
        console.error('Error buscando equipo técnico:', err)
      } finally {
        setTecLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [form.vt_nombre_tecnico])

  function set(name, value) {
    setForm(f => ({ ...f, [name]: value }))
    setSaved(false)
  }

  function handleChange(e) {
    const { name, value } = e.target
    if (name === 'f3_rut') { set(name, formatRut(value)); return }
    set(name, value)
  }

  function seleccionarApicultor(a) {
    const nombre = (a.nombre_completo || `${a.nombres || ''} ${a.apellidos || ''}`).trim()
    skipApiSearch.current = true
    setForm(prev => ({
      ...prev,
      f1_nombre: nombre,
      f3_rut: a.rut || '',
      f4_telefono: a.telefono || '',
      f7_comuna: a.comuna || '',
      f9_dir_propiedad: a.direccion || '',
      f5_email: a.email || '',
    }))
    setApiResults([])
    setShowApi(false)
    setSaved(false)
  }

  function seleccionarTecnico(m) {
    const nombre = (m.nombre_completo || `${m.nombres || ''} ${m.apellidos || ''}`).trim()
    skipTecSearch.current = true
    setForm(prev => ({ ...prev, vt_nombre_tecnico: nombre }))
    setTecResults([])
    setShowTec(false)
    setSaved(false)
  }

  async function saveData(andClose = false) {
    if (!form.f1_nombre.trim()) return alert('El nombre completo del apicultor es obligatorio')
    if (saving) return
    setSaving(true)
    const now = new Date().toISOString()
    try {
      if (savedId) {
        await db.visitas.update(savedId, {
          ...form,
          tipo_visita: 'tecnica',
          sync_status: SYNC_STATUS.PENDING,
          updated_at: now,
        })
      } else {
        const id = await db.visitas.add({
          uuid: generateUUID(),
          ...form,
          tipo_visita: 'tecnica',
          sync_status: SYNC_STATUS.PENDING,
          created_at: now,
          updated_at: now,
        })
        setSavedId(id)
      }
      setSaved(true)
      if (isOnline) {
        syncAll(true).catch(err => console.error('Sync error:', err))
      }
      if (andClose) setTimeout(() => navigate('/historial-visita-tecnica'), 1200)
    } catch (err) {
      alert('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    saveData(true)
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)} className="p-1 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-amber-500" /> {id ? 'Editar' : 'Nueva'} Visita Técnica
          </h2>
        </div>
      </div>

      {/* Encabezado */}
      <div className="card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <label className="label text-xs font-medium text-gray-700">Nombre Técnico</label>
            <input name="vt_nombre_tecnico" value={form.vt_nombre_tecnico} onChange={handleChange}
              autoComplete="off"
              className="input-field w-full" placeholder="Nombre del técnico" />
            {tecLoading && <p className="text-xs text-gray-400 mt-1">Buscando…</p>}
            {showTec && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {tecResults.map(m => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => seleccionarTecnico(m)}
                    className="w-full text-left px-3 py-2 hover:bg-honey-50 flex items-center gap-2 border-b border-gray-50 last:border-0"
                  >
                    <User className="w-4 h-4 text-honey-600 flex-shrink-0" />
                    <span className="text-sm text-gray-800">
                      {(m.nombre_completo || `${m.nombres || ''} ${m.apellidos || ''}`).trim()}
                      {m.cargo ? <span className="text-xs text-gray-500"> · {m.cargo}</span> : null}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="label text-xs font-medium text-gray-700">Fecha visita</label>
            <input type="date" name="vt_fecha_visita" value={form.vt_fecha_visita} onChange={handleChange}
              className="input-field w-full" />
          </div>
        </div>
      </div>

      {/* Antecedentes del Apicultor */}
      <div className="card space-y-3">
        <h3 className="font-bold text-sm text-gray-700">Antecedentes del Apicultor</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 relative">
            <label className="label text-xs font-medium text-gray-700">Nombre completo</label>
            <input name="f1_nombre" value={form.f1_nombre} onChange={handleChange}
              autoComplete="off"
              className="input-field w-full" placeholder="Nombre completo" />
            {apiLoading && <p className="text-xs text-gray-400 mt-1">Buscando…</p>}
            {showApi && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {apiResults.map(a => (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => seleccionarApicultor(a)}
                    className="w-full text-left px-3 py-2 hover:bg-honey-50 flex items-center gap-2 border-b border-gray-50 last:border-0"
                  >
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
            <input name="f3_rut" value={form.f3_rut} onChange={handleChange}
              className="input-field w-full" placeholder="12.345.678-9" />
          </div>
          <div>
            <label className="label text-xs font-medium text-gray-700">Teléfono</label>
            <input name="f4_telefono" value={form.f4_telefono} onChange={handleChange}
              className="input-field w-full" placeholder="+56 9 ..." />
          </div>
          <div className="sm:col-span-2">
            <label className="label text-xs font-medium text-gray-700">Correo electrónico</label>
            <input type="email" name="f5_email" value={form.f5_email} onChange={handleChange}
              className="input-field w-full" placeholder="correo@ejemplo.cl" />
          </div>
          <div>
            <label className="label text-xs font-medium text-gray-700">Dirección / Sector</label>
            <input name="f9_dir_propiedad" value={form.f9_dir_propiedad} onChange={handleChange}
              className="input-field w-full" placeholder="Dirección o sector" />
          </div>
          <div>
            <label className="label text-xs font-medium text-gray-700">Comuna</label>
            <input name="f7_comuna" value={form.f7_comuna} onChange={handleChange}
              className="input-field w-full" placeholder="Comuna" />
          </div>
        </div>
      </div>

      {/* Datos del Apiario */}
      <div className="card space-y-3">
        <h3 className="font-bold text-sm text-gray-700">Datos del Apiario</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs font-medium text-gray-700">Nombre del apiario</label>
            <input name="vt_nombre_apiario" value={form.vt_nombre_apiario} onChange={handleChange}
              className="input-field w-full" placeholder="Nombre del apiario" />
          </div>
          <div>
            <label className="label text-xs font-medium text-gray-700">Número total de colmenas</label>
            <input name="vt_num_colmenas" value={form.vt_num_colmenas} onChange={handleChange}
              className="input-field w-full" placeholder="N° de colmenas" />
          </div>
          <div className="sm:col-span-2">
            <label className="label text-xs font-medium text-gray-700">Actividad principal</label>
            <p className="text-[11px] text-gray-400 mb-1">miel, polen, reinas, núcleos</p>
            <input name="vt_actividad_principal" value={form.vt_actividad_principal} onChange={handleChange}
              className="input-field w-full" placeholder="Actividad principal" />
          </div>
        </div>
      </div>

      {/* Condición Sanitaria */}
      <div className="card space-y-3">
        <h3 className="font-bold text-sm text-gray-700">Condición Sanitaria</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs font-medium text-gray-700">Presencia de varroa (%)</label>
            <input name="vt_varroa_pct" value={form.vt_varroa_pct} onChange={handleChange}
              className="input-field w-full" placeholder="%" />
          </div>
          <div>
            <label className="label text-xs font-medium text-gray-700">Fecha último tratamiento</label>
            <input type="date" name="vt_fecha_ultimo_tratamiento" value={form.vt_fecha_ultimo_tratamiento} onChange={handleChange}
              className="input-field w-full" />
          </div>
          <div className="sm:col-span-2">
            <label className="label text-xs font-medium text-gray-700">Enfermedades observadas</label>
            <textarea name="vt_enfermedades" value={form.vt_enfermedades} onChange={handleChange}
              rows={2} className="input-field w-full resize-none" placeholder="Enfermedades observadas…" />
          </div>
          <div className="sm:col-span-2">
            <label className="label text-xs font-medium text-gray-700">Tratamientos aplicados</label>
            <textarea name="vt_tratamientos" value={form.vt_tratamientos} onChange={handleChange}
              rows={2} className="input-field w-full resize-none" placeholder="Tratamientos aplicados…" />
          </div>
        </div>
      </div>

      {/* Producción */}
      <div className="card space-y-3">
        <h3 className="font-bold text-sm text-gray-700">Producción</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs font-medium text-gray-700">Producción temporada anterior (kg)</label>
            <input name="vt_prod_anterior" value={form.vt_prod_anterior} onChange={handleChange}
              className="input-field w-full" placeholder="kg" />
          </div>
          <div>
            <label className="label text-xs font-medium text-gray-700">Producción estimada actual (kg)</label>
            <input name="vt_prod_estimada" value={form.vt_prod_estimada} onChange={handleChange}
              className="input-field w-full" placeholder="kg" />
          </div>
          <div className="sm:col-span-2">
            <label className="label text-xs font-medium text-gray-700">Tipo de miel</label>
            <input name="vt_tipo_miel" value={form.vt_tipo_miel} onChange={handleChange}
              className="input-field w-full" placeholder="Tipo de miel" />
          </div>
        </div>
      </div>

      {/* Manejo Técnico */}
      <div className="card space-y-3">
        <h3 className="font-bold text-sm text-gray-700">Manejo Técnico</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs font-medium text-gray-700">Alimentación suplementaria</label>
            <input name="vt_alimentacion" value={form.vt_alimentacion} onChange={handleChange}
              className="input-field w-full" placeholder="Alimentación suplementaria" />
          </div>
          <div>
            <label className="label text-xs font-medium text-gray-700">Renovación de reinas (%)</label>
            <input name="vt_renovacion_reinas" value={form.vt_renovacion_reinas} onChange={handleChange}
              className="input-field w-full" placeholder="%" />
          </div>
          <div>
            <label className="label text-xs font-medium text-gray-700">Recambio de marcos (%)</label>
            <input name="vt_recambio_marcos" value={form.vt_recambio_marcos} onChange={handleChange}
              className="input-field w-full" placeholder="%" />
          </div>
          <div>
            <label className="label text-xs font-medium text-gray-700">Calendario de manejo</label>
            <input name="vt_calendario_manejo" value={form.vt_calendario_manejo} onChange={handleChange}
              className="input-field w-full" placeholder="Calendario de manejo" />
          </div>
        </div>
      </div>

      {/* Observaciones de la Visita */}
      <div className="card space-y-3">
        <h3 className="font-bold text-sm text-gray-700">Observaciones de la Visita</h3>
        <div>
          <label className="label text-xs font-medium text-gray-700">Principales problemas detectados</label>
          <textarea name="vt_problemas" value={form.vt_problemas} onChange={handleChange}
            rows={3} className="input-field w-full resize-none" placeholder="Principales problemas detectados…" />
        </div>
        <div>
          <label className="label text-xs font-medium text-gray-700">Recomendaciones técnicas</label>
          <textarea name="vt_recomendaciones" value={form.vt_recomendaciones} onChange={handleChange}
            rows={3} className="input-field w-full resize-none" placeholder="Recomendaciones técnicas…" />
        </div>
        <div>
          <label className="label text-xs font-medium text-gray-700">Compromisos del apicultor</label>
          <textarea name="vt_compromisos" value={form.vt_compromisos} onChange={handleChange}
            rows={3} className="input-field w-full resize-none" placeholder="Compromisos del apicultor…" />
        </div>
        <div>
          <label className="label text-xs font-medium text-gray-700">Fecha próxima visita</label>
          <input type="date" name="vt_fecha_proxima_visita" value={form.vt_fecha_proxima_visita} onChange={handleChange}
            className="input-field w-full" />
        </div>
      </div>

      {/* Informe Visita */}
      <div className="card space-y-3">
        <h3 className="font-bold text-sm text-gray-700">Informe Visita</h3>
        <div>
          <label className="label text-xs font-medium text-gray-700">Detallar actividad realizada</label>
          <textarea name="vt_informe" value={form.vt_informe} onChange={handleChange}
            rows={5} className="input-field w-full resize-none" placeholder="Detallar actividad realizada…" />
        </div>
      </div>

      {/* Firmas */}
      <div className="card space-y-3">
        <h3 className="font-bold text-sm text-gray-700">Firmas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs font-medium text-gray-700">Firma técnico</label>
            <input name="vt_firma_tecnico" value={form.vt_firma_tecnico} onChange={handleChange}
              className="input-field w-full" placeholder="Nombre del técnico" />
          </div>
          <div>
            <label className="label text-xs font-medium text-gray-700">Firma apicultor</label>
            <input name="vt_firma_apicultor" value={form.vt_firma_apicultor} onChange={handleChange}
              className="input-field w-full" placeholder="Nombre del apicultor" />
          </div>
        </div>
      </div>

      {saved && (
        <div className="card bg-green-50 border-green-200 text-green-700 text-sm font-medium">
          ✓ Visita técnica guardada
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={() => saveData(false)} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 bg-amber-100 text-amber-700 hover:bg-amber-200 font-semibold py-3 rounded-lg transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50">
          <Save className="w-4 h-4" /> Guardar y cerrar
        </button>
      </div>
    </form>
  )
}
