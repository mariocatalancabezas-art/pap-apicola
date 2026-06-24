import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2, FileText, Stethoscope } from 'lucide-react'
import { db, SYNC_STATUS, generateUUID } from '../lib/db'
import { useAuth } from '../lib/AuthContext'
import { syncAll } from '../lib/sync'
import VoiceInput from '../components/VoiceInput'

const TIPOS = {
  secretaria: { label: 'Secretaría', icon: FileText, permisoVer: 'puede_ver_observaciones_secretaria', permisoEditar: 'puede_editar_observaciones_secretaria' },
  tecnico_administrativa: { label: 'Técnico Administrativa', icon: Stethoscope, permisoVer: 'puede_ver_observaciones_tecnico_administrativa', permisoEditar: 'puede_editar_observaciones_tecnico_administrativa' },
}

const TIPOS_ORDEN = ['secretaria', 'tecnico_administrativa']

function formatearRut(rut) {
  if (!rut) return '—'
  const limpio = String(rut).replace(/[^0-9kK]/g, '').toUpperCase()
  if (limpio.length < 2) return rut
  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  const formateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formateado}-${dv}`
}

function nombreCorto(a) {
  const n = (a.nombres || '').trim().split(/\s+/)[0] || ''
  const ap = (a.apellidos || '').trim().split(/\s+/)[0] || ''
  return `${n} ${ap}`.trim() || a.nombre_completo
}

function ordenarPorCreacion(obs) {
  return obs
    .map((o, i) => ({ o, i }))
    .sort((a, b) => {
      const ca = String(a.o.created_at || '')
      const cb = String(b.o.created_at || '')
      if (ca && cb && ca !== cb) return ca.localeCompare(cb)
      if (ca && !cb) return 1
      if (!ca && cb) return -1
      return a.i - b.i
    })
    .map(x => x.o)
}

function getObservaciones(a, tipo) {
  if (!a.observaciones) return []
  if (Array.isArray(a.observaciones)) {
    return tipo === 'secretaria' ? a.observaciones : []
  }
  return Array.isArray(a.observaciones[tipo]) ? a.observaciones[tipo] : []
}

export default function ObservacionesApicultorDetail() {
  const { id, tipo } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const esAdmin = user?.rol === 'admin'
  const config = TIPOS[tipo]
  const puedeVer = esAdmin || user?.puede_ver_observaciones_apicultores === true || user?.[config?.permisoVer] === true
  const puedeEditar = esAdmin || user?.puede_editar_observaciones_apicultores === true || user?.[config?.permisoEditar] === true

  const [apicultor, setApicultor] = useState(null)
  const [observaciones, setObservaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  async function cargar() {
    setLoading(true)
    try {
      const a = await db.apicultores.get(Number(id))
      if (!a) {
        setMsg('✗ Apicultor no encontrado')
        setLoading(false)
        return
      }
      if (!config) {
        setMsg('✗ Tipo de observación no válido')
        setLoading(false)
        return
      }
      setApicultor(a)
      const obs = getObservaciones(a, tipo)
      if (obs.length === 0) {
        const now = new Date().toISOString()
        setObservaciones([
          { id: generateUUID(), nombre: 'Observación 1', texto: '', created_at: now },
          { id: generateUUID(), nombre: 'Observación 2', texto: '', created_at: now },
        ])
      } else {
        setObservaciones(ordenarPorCreacion(obs))
      }
    } catch (err) {
      setMsg('✗ Error al cargar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (puedeVer) cargar()
  }, [id, tipo, puedeVer])

  function actualizarObs(index, campo, valor) {
    setObservaciones(prev => prev.map((o, i) => i === index ? { ...o, [campo]: valor } : o))
  }

  function eliminarObs(index) {
    if (!confirm('¿Eliminar esta observación?')) return
    setObservaciones(prev => prev.filter((_, i) => i !== index))
  }

  function agregarObs() {
    setObservaciones(prev => [
      ...prev,
      { id: generateUUID(), nombre: `Observación ${prev.length + 1}`, texto: '', created_at: new Date().toISOString() }
    ])
  }

  async function guardar() {
    if (!apicultor || !config) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      let observacionesActual = apicultor.observaciones
      if (Array.isArray(observacionesActual)) {
        observacionesActual = { secretaria: observacionesActual, tecnico_administrativa: [] }
      }
      if (!observacionesActual || typeof observacionesActual !== 'object') {
        observacionesActual = {}
      }
      observacionesActual = { ...observacionesActual, [tipo]: observaciones }
      await db.apicultores.update(apicultor.id, {
        observaciones: observacionesActual,
        updated_at: now,
        sync_status: SYNC_STATUS.PENDING,
      })
      setMsg('✓ Observaciones guardadas')
      syncAll(true).catch(err => console.error('Sync error:', err))
    } catch (err) {
      setMsg('✗ Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!config) {
    return (
      <div className="p-4">
        <div className="card bg-red-50 border-red-200 text-red-700 text-sm">
          Tipo de observación no válido.
        </div>
      </div>
    )
  }

  if (!puedeVer) {
    return (
      <div className="p-4">
        <div className="card bg-red-50 border-red-200 text-red-700 text-sm">
          No tienes permisos para ver esta página.
        </div>
      </div>
    )
  }

  if (loading) return <p className="p-4 text-sm text-gray-500 text-center">Cargando…</p>
  if (!apicultor) return <p className="p-4 text-sm text-red-600 text-center">Apicultor no encontrado.</p>

  const Icon = config.icon

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/observaciones-apicultores')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-honey-600" />
          <h2 className="text-lg font-bold">Observaciones: {config.label}</h2>
        </div>
      </div>

      <div className="card bg-honey-50 border-honey-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">{nombreCorto(apicultor)}</p>
          <p className="text-xs text-gray-500">{formatearRut(apicultor.rut)}</p>
        </div>
        <div className="flex gap-2">
          {TIPOS_ORDEN.filter(t => t !== tipo).map(t => {
            const tConfig = TIPOS[t]
            const TC = tConfig.icon
            const puedeVerOtro = esAdmin || user?.puede_ver_observaciones_apicultores === true || user?.[tConfig.permisoVer] === true
            if (!puedeVerOtro) return null
            return (
              <button
                key={t}
                onClick={() => navigate(`/observaciones-apicultores/${id}/${t}`)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border text-xs text-gray-700 hover:bg-gray-50"
              >
                <TC className="w-3.5 h-3.5 text-honey-600" /> {tConfig.label}
              </button>
            )
          })}
        </div>
      </div>

      {msg && (
        <div className={`card text-sm font-medium ${msg.startsWith('✓') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {msg}
        </div>
      )}

      <div className="space-y-4">
        {observaciones.map((obs, idx) => (
          <div key={obs.id || idx} className="card p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={obs.nombre}
                onChange={e => actualizarObs(idx, 'nombre', e.target.value)}
                disabled={!puedeEditar}
                className="input-field flex-1 text-sm font-semibold"
                placeholder={`Nombre de la observación ${idx + 1}`}
              />
              {puedeEditar && observaciones.length > 1 && (
                <button
                  onClick={() => eliminarObs(idx)}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                  title="Eliminar observación"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <VoiceInput
              value={obs.texto}
              onChange={val => actualizarObs(idx, 'texto', val)}
              disabled={!puedeEditar}
              placeholder={`Escribe o dicta la observación ${idx + 1}…`}
            />
          </div>
        ))}
      </div>

      {puedeEditar && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={agregarObs}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Agregar observación
          </button>
          <button
            onClick={guardar}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-honey-100 text-honey-700 hover:bg-honey-200 text-sm font-medium"
          >
            <Save className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      )}
    </div>
  )
}
