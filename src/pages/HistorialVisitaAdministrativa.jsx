import React, { useState, useEffect, useCallback } from 'react'
import { FileText, ArrowDownUp, ChevronDown, ChevronUp, Search, Trash2 } from 'lucide-react'
import { db, SYNC_STATUS } from '../lib/db'
import { syncAll } from '../lib/sync'
import { useAuth } from '../lib/AuthContext'

export default function HistorialVisitaAdministrativa() {
  const { user } = useAuth()
  const esAdmin = user?.rol === 'admin'
  const [visitas, setVisitas] = useState([])
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState('desc')
  const [expandedId, setExpandedId] = useState(null)

  const load = useCallback(async () => {
    const vs = await db.visitas
      .where('tipo_visita')
      .equals('administrativa')
      .and(v => !v.deleted_at)
      .toArray()
    setVisitas(vs)
  }, [])

  useEffect(() => { load() }, [load])

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta visita administrativa?\n\nSe sincronizará la eliminación en todos los dispositivos.')) return
    await db.visitas.update(id, {
      deleted_at: new Date().toISOString(),
      sync_status: SYNC_STATUS.PENDING,
      updated_at: new Date().toISOString(),
    })
    syncAll(true).catch(err => console.error('Sync error:', err))
    load()
  }

  const filtered = visitas.filter(v => {
    const q = search.toLowerCase()
    return !q ||
      (v.f1_nombre || '').toLowerCase().includes(q) ||
      (v.f3_rut || '').toLowerCase().includes(q) ||
      (v.va_tema_principal || '').toLowerCase().includes(q) ||
      (v.va_tema_otro || '').toLowerCase().includes(q) ||
      (v.va_nombre_tecnico || '').toLowerCase().includes(q) ||
      (v.va_observaciones || '').toLowerCase().includes(q) ||
      (v.va_acuerdos || '').toLowerCase().includes(q)
  })

  const sorted = [...filtered].sort((a, b) => {
    const da = new Date(a.created_at || 0)
    const dbb = new Date(b.created_at || 0)
    return sortOrder === 'desc' ? dbb - da : da - dbb
  })

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-500" /> Historial Visitas Administrativas
        </h2>
      </div>

      <div className="card space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar nombre, RUT, técnico, tema u observación…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{sorted.length} visita{sorted.length !== 1 ? 's' : ''} encontrada{sorted.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2 py-1 rounded-lg transition-colors"
        >
          <ArrowDownUp className="w-3.5 h-3.5" />
          {sortOrder === 'desc' ? 'Más reciente' : 'Más antiguo'}
        </button>
      </div>

      {sorted.length === 0 && (
        <div className="card text-center py-8 text-gray-400">
          <FileText className="w-16 h-16 mx-auto mb-3 opacity-50" />
          <p>No hay visitas administrativas registradas</p>
        </div>
      )}

      <div className="space-y-2">
        {sorted.map(v => {
          const isExpanded = expandedId === v.id
          const nombre = (v.f1_nombre || '').trim() || 'Sin nombre'
          const tema = v.va_tema_principal === 'Otro' ? (v.va_tema_otro || 'Otro') : v.va_tema_principal
          return (
            <div key={v.id} className="card">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : v.id)}
              >
                <div>
                  <span className="font-semibold text-sm text-gray-800">{nombre}</span>
                  <p className="text-xs text-gray-500">
                    {v.va_fecha_visita || 'Sin fecha'}{tema ? ` · ${tema}` : ''}
                  </p>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600 space-y-1.5">
                  {v.va_nombre_tecnico && <p><strong>Técnico:</strong> {v.va_nombre_tecnico}</p>}
                  <p><strong>RUT:</strong> {v.f3_rut || 'N/A'}</p>
                  <p><strong>Teléfono:</strong> {v.f4_telefono || 'N/A'}</p>
                  <p><strong>Dirección/sector:</strong> {v.f9_dir_propiedad || 'N/A'}</p>
                  <p><strong>Comuna:</strong> {v.f7_comuna || 'N/A'}</p>
                  <p><strong>Correo:</strong> {v.f5_email || 'N/A'}</p>
                  {tema && <p><strong>Tema principal:</strong> {tema}</p>}
                  {v.va_observaciones && <p className="whitespace-pre-wrap"><strong>Observaciones:</strong> {v.va_observaciones}</p>}
                  {v.va_acuerdos && <p className="whitespace-pre-wrap"><strong>Acuerdos o compromisos:</strong> {v.va_acuerdos}</p>}
                  {(v.va_firma_asesor || v.va_firma_usuario) && (
                    <p><strong>Firmas:</strong> {v.va_firma_asesor || '—'} / {v.va_firma_usuario || '—'}</p>
                  )}
                  {esAdmin && (
                    <div className="pt-2">
                      <button
                        onClick={() => eliminar(v.id)}
                        className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
