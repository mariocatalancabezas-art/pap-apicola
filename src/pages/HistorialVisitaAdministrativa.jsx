import React, { useState, useEffect, useCallback } from 'react'
import { FileText, ArrowDownUp, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { db } from '../lib/db'

export default function HistorialVisitaAdministrativa() {
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

  const filtered = visitas.filter(v => {
    const nombre = `${v.f1_nombre || ''} ${v.f2_apellido || ''}`.toLowerCase()
    const matchSearch = !search ||
      nombre.includes(search.toLowerCase()) ||
      (v.f3_rut || '').toLowerCase().includes(search.toLowerCase()) ||
      (v.f15_poder_comprador || '').toLowerCase().includes(search.toLowerCase()) ||
      (v.f24_especie_principal || '').toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  const sorted = [...filtered].sort((a, b) => {
    const da = new Date(a.created_at || 0)
    const db = new Date(b.created_at || 0)
    return sortOrder === 'desc' ? db - da : da - db
  })

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-500" /> Historial Visita Administrativa
        </h2>
      </div>

      <div className="card space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar nombre, RUT, empresa, especie…"
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
          const nombre = `${v.f1_nombre || ''} ${v.f2_apellido || ''}`.trim() || 'Sin nombre'
          return (
            <div key={v.id} className="card">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : v.id)}
              >
                <div>
                  <span className="font-semibold text-sm text-gray-800">{nombre}</span>
                  <p className="text-xs text-gray-500">{v.f19_fecha_encuesta || 'Sin fecha'} · {v.f6_region}{v.f7_comuna ? ` · ${v.f7_comuna}` : ''}</p>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600 space-y-1">
                  <p><strong>RUT:</strong> {v.f3_rut || 'N/A'}</p>
                  <p><strong>Teléfono:</strong> {v.f4_telefono || 'N/A'}</p>
                  <p><strong>Email:</strong> {v.f5_email || 'N/A'}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
