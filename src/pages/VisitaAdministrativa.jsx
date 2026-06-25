import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, ChevronLeft, FileText, User } from 'lucide-react'
import { db, SYNC_STATUS, generateUUID } from '../lib/db'
import { syncAll } from '../lib/sync'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { buscarApicultoresPorNombre, buscarEquipoTecnicoPorNombre } from '../lib/importApicultores'

const TEMAS = [
  'Documentación SAG',
  'Proyectos de Inversión',
  'Formalización SII',
  'Resolución Sanitaria',
  'Otro',
]

const EMPTY = {
  va_nombre_tecnico: '',
  va_fecha_visita: new Date().toISOString().slice(0, 10),
  f1_nombre: '',
  f3_rut: '',
  f9_dir_propiedad: '',
  f4_telefono: '',
  f7_comuna: '',
  f5_email: '',
  va_tema_principal: '',
  va_tema_otro: '',
  va_observaciones: '',
  va_acuerdos: '',
  va_firma_asesor: '',
  va_firma_usuario: '',
}

function formatRut(raw) {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length === 0) return ''
  const dv = clean.slice(-1)
  const num = clean.slice(0, -1)
  if (num.length === 0) return dv
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv
}

export default function VisitaAdministrativa() {
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()

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
    const q = form.va_nombre_tecnico || ''
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
  }, [form.va_nombre_tecnico])

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
    setForm(prev => ({ ...prev, va_nombre_tecnico: nombre }))
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
          tipo_visita: 'administrativa',
          sync_status: SYNC_STATUS.PENDING,
          updated_at: now,
        })
      } else {
        const id = await db.visitas.add({
          uuid: generateUUID(),
          ...form,
          tipo_visita: 'administrativa',
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
      if (andClose) setTimeout(() => navigate('/historial-visita-administrativa'), 1200)
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
            <FileText className="w-5 h-5 text-amber-500" /> Nueva Visita Administrativa
          </h2>
        </div>
      </div>

      {/* Encabezado */}
      <div className="card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <label className="label text-xs font-medium text-gray-700">Nombre Técnico</label>
            <input name="va_nombre_tecnico" value={form.va_nombre_tecnico} onChange={handleChange}
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
            <input type="date" name="va_fecha_visita" value={form.va_fecha_visita} onChange={handleChange}
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
          <div>
            <label className="label text-xs font-medium text-gray-700">Dirección/sector</label>
            <input name="f9_dir_propiedad" value={form.f9_dir_propiedad} onChange={handleChange}
              className="input-field w-full" placeholder="Dirección o sector" />
          </div>
          <div>
            <label className="label text-xs font-medium text-gray-700">Comuna</label>
            <input name="f7_comuna" value={form.f7_comuna} onChange={handleChange}
              className="input-field w-full" placeholder="Comuna" />
          </div>
          <div className="sm:col-span-2">
            <label className="label text-xs font-medium text-gray-700">Correo electrónico</label>
            <input type="email" name="f5_email" value={form.f5_email} onChange={handleChange}
              className="input-field w-full" placeholder="correo@ejemplo.cl" />
          </div>
        </div>
      </div>

      {/* Acta de la visita */}
      <div className="card space-y-3">
        <h3 className="font-bold text-sm text-gray-700">Acta de la visita</h3>
        <div>
          <label className="label text-xs font-medium text-gray-700">Tema Principal</label>
          <p className="text-[11px] text-gray-400 mb-1">
            Documentación SAG, Proyectos de Inversión, Formalización SII, Resolución Sanitaria u otro
          </p>
          <select name="va_tema_principal" value={form.va_tema_principal} onChange={handleChange}
            className="input-field w-full">
            <option value="">Seleccione un tema…</option>
            {TEMAS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {form.va_tema_principal === 'Otro' && (
            <input name="va_tema_otro" value={form.va_tema_otro} onChange={handleChange}
              className="input-field w-full mt-2" placeholder="Especifique el tema" />
          )}
        </div>
        <div>
          <label className="label text-xs font-medium text-gray-700">Observaciones</label>
          <textarea name="va_observaciones" value={form.va_observaciones} onChange={handleChange}
            rows={5} className="input-field w-full resize-none" placeholder="Observaciones de la visita…" />
        </div>
        <div>
          <label className="label text-xs font-medium text-gray-700">Acuerdos o Compromisos</label>
          <textarea name="va_acuerdos" value={form.va_acuerdos} onChange={handleChange}
            rows={5} className="input-field w-full resize-none" placeholder="Acuerdos o compromisos…" />
        </div>
      </div>

      {/* Firmas */}
      <div className="card space-y-3">
        <h3 className="font-bold text-sm text-gray-700">Firmas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs font-medium text-gray-700">Firma Asesor</label>
            <input name="va_firma_asesor" value={form.va_firma_asesor} onChange={handleChange}
              className="input-field w-full" placeholder="Nombre del asesor" />
          </div>
          <div>
            <label className="label text-xs font-medium text-gray-700">Firma Usuario</label>
            <input name="va_firma_usuario" value={form.va_firma_usuario} onChange={handleChange}
              className="input-field w-full" placeholder="Nombre del usuario" />
          </div>
        </div>
      </div>

      {saved && (
        <div className="card bg-green-50 border-green-200 text-green-700 text-sm font-medium">
          ✓ Visita administrativa guardada
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
