import React, { useEffect, useState } from 'react'
import { MessageSquare, Search, FileText, Stethoscope, Pencil, Save, X } from 'lucide-react'
import { db } from '../lib/db'
import { useAuth } from '../lib/AuthContext'
import { useNavigate } from 'react-router-dom'
import { CATEGORIAS, fetchLabels, saveLabels, getCachedLabels, getObsTecnica } from '../lib/obsTecnica'

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

function contarObservaciones(a, key) {
  return getObsTecnica(a, key).filter(o => (o.texto || '').trim()).length
}

function textoPreview(a, key, search) {
  const conTexto = getObsTecnica(a, key).filter(o => (o.texto || '').trim())
  if (conTexto.length === 0) return ''
  const q = (search || '').trim().toLowerCase()
  let elegido = conTexto[0]
  if (q) {
    const match = conTexto.find(o =>
      (o.texto || '').toLowerCase().includes(q) || (o.nombre || '').toLowerCase().includes(q))
    if (match) elegido = match
  }
  return elegido.texto.slice(0, 60) + (elegido.texto.length > 60 ? '…' : '')
}

const ICONS = { jriquelme: FileText, eburgos: Stethoscope }

export default function ObservacionesVisitaTecnica() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const esAdmin = user?.rol === 'admin'
  const puedeVerCategoria = key => esAdmin || user?.[CATEGORIAS.find(c => c.key === key).permisoVer] === true
  const puedeEditarCategoria = key => esAdmin || user?.[CATEGORIAS.find(c => c.key === key).permisoEditar] === true
  const puedeVerGlobal = esAdmin || CATEGORIAS.some(c => user?.[c.permisoVer] === true)

  const [apicultores, setApicultores] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [labels, setLabels] = useState(getCachedLabels())
  const [editLabels, setEditLabels] = useState(null)
  const [savingLabels, setSavingLabels] = useState(false)

  async function cargar() {
    setLoading(true)
    try {
      const all = await db.apicultores.filter(a => !a.deleted_at).toArray()
      all.sort((x, y) => String(x.created_at || '').localeCompare(String(y.created_at || '')))
      const seen = new Set()
      const unicos = []
      for (const a of all) {
        const key = (a.nombre_completo || '').trim().toUpperCase()
        if (!key || seen.has(key)) continue
        seen.add(key)
        unicos.push(a)
      }
      setApicultores(unicos)
    } catch (err) {
      setMsg('✗ Error al cargar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (puedeVerGlobal) cargar()
    fetchLabels().then(setLabels).catch(() => {})
  }, [puedeVerGlobal])

  function labelDe(key) {
    return labels[key] || CATEGORIAS.find(c => c.key === key).defaultLabel
  }

  async function guardarLabels() {
    setSavingLabels(true)
    try {
      const nuevos = await saveLabels(editLabels)
      setLabels(nuevos)
      setEditLabels(null)
      setMsg('✓ Nombres actualizados')
    } catch (err) {
      setMsg('✗ Error: ' + err.message)
    } finally {
      setSavingLabels(false)
    }
  }

  const filtered = apicultores.filter(a => {
    const texto = search.trim().toLowerCase()
    if (!texto) return true
    const enNombre = (nombreCorto(a) || '').toLowerCase().includes(texto)
    const enRut = (a.rut || '').toLowerCase().includes(texto)
    const enObs = CATEGORIAS.some(c =>
      puedeVerCategoria(c.key) &&
      getObsTecnica(a, c.key).some(o =>
        (o.texto || '').toLowerCase().includes(texto) ||
        (o.nombre || '').toLowerCase().includes(texto)))
    return enNombre || enRut || enObs
  })

  if (!puedeVerGlobal) {
    return (
      <div className="p-4">
        <div className="card bg-red-50 border-red-200 text-red-700 text-sm">
          No tienes permisos para ver esta página.
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-honey-600" />
          <h2 className="text-lg font-bold">Observaciones Apicultores · Visita Técnica</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, RUT u observación…"
            className="input-field pl-9 w-full sm:w-64"
          />
        </div>
      </div>

      {esAdmin && (
        <div className="card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Nombres de las categorías</span>
            {editLabels === null ? (
              <button
                onClick={() => setEditLabels({ ...labels })}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                <Pencil className="w-3.5 h-3.5" /> Editar nombres
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={guardarLabels}
                  disabled={savingLabels}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-honey-100 text-honey-700 hover:bg-honey-200 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" /> {savingLabels ? 'Guardando…' : 'Guardar'}
                </button>
                <button
                  onClick={() => setEditLabels(null)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  <X className="w-3.5 h-3.5" /> Cancelar
                </button>
              </div>
            )}
          </div>
          {editLabels !== null && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORIAS.map(c => (
                <input
                  key={c.key}
                  type="text"
                  value={editLabels[c.key]}
                  onChange={e => setEditLabels(prev => ({ ...prev, [c.key]: e.target.value }))}
                  className="input-field text-sm"
                  placeholder={c.defaultLabel}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {msg && (
        <div className={`card text-sm font-medium ${msg.startsWith('✓') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {msg}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 text-center py-8">Cargando…</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <div key={a.id} className="card p-3 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-honey-600" />
                <span className="font-semibold text-sm text-gray-800">{nombreCorto(a)}</span>
                <span className="text-xs text-gray-500">{formatearRut(a.rut)}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATEGORIAS.map(c => {
                  const Icon = ICONS[c.key] || FileText
                  const visible = puedeVerCategoria(c.key)
                  const editable = puedeEditarCategoria(c.key)
                  const cantidad = contarObservaciones(a, c.key)
                  const preview = textoPreview(a, c.key, search)
                  if (!visible && !editable) return null
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => navigate(`/observaciones-visita-tecnica/${a.id}/${c.key}`)}
                      className={`text-left border rounded-lg p-3 transition-colors ${
                        editable
                          ? 'bg-white hover:border-honey-400 hover:bg-honey-50 cursor-pointer'
                          : 'bg-gray-50 cursor-pointer hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-honey-600" />
                          <span className="text-sm font-semibold text-gray-800">{labelDe(c.key)}</span>
                        </div>
                        {cantidad > 0 && (
                          <span className="text-[10px] bg-honey-100 text-honey-700 px-1.5 py-0.5 rounded-full">
                            {cantidad} observación{cantidad !== 1 ? 'es' : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 min-h-[2rem]">
                        {preview || 'Sin observaciones.'}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="card text-center py-8 text-sm text-gray-500">
              No se encontraron apicultores.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
