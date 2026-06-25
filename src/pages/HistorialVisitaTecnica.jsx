import React, { useState, useEffect, useCallback } from 'react'
import { Stethoscope, ArrowDownUp, ChevronDown, ChevronUp, Search, Trash2 } from 'lucide-react'
import { db, SYNC_STATUS } from '../lib/db'
import { syncAll } from '../lib/sync'
import { useAuth } from '../lib/AuthContext'

export default function HistorialVisitaTecnica() {
  const { user } = useAuth()
  const esAdmin = user?.rol === 'admin'
  const [visitas, setVisitas] = useState([])
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState('desc')
  const [expandedId, setExpandedId] = useState(null)

  const load = useCallback(async () => {
    const vs = await db.visitas
      .where('tipo_visita')
      .equals('tecnica')
      .and(v => !v.deleted_at)
      .toArray()
    setVisitas(vs)
  }, [])

  useEffect(() => { load() }, [load])

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta visita técnica?\n\nSe sincronizará la eliminación en todos los dispositivos.')) return
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
      (v.vt_nombre_tecnico || '').toLowerCase().includes(q) ||
      (v.vt_nombre_apiario || '').toLowerCase().includes(q) ||
      (v.vt_problemas || '').toLowerCase().includes(q) ||
      (v.vt_recomendaciones || '').toLowerCase().includes(q) ||
      (v.vt_compromisos || '').toLowerCase().includes(q) ||
      (v.vt_informe || '').toLowerCase().includes(q)
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
          <Stethoscope className="w-5 h-5 text-amber-500" /> Historial Visita Técnica
        </h2>
      </div>

      <div className="card space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar nombre, RUT, técnico, apiario u observación…"
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
          <Stethoscope className="w-16 h-16 mx-auto mb-3 opacity-50" />
          <p>No hay visitas técnicas registradas</p>
        </div>
      )}

      <div className="space-y-2">
        {sorted.map(v => {
          const isExpanded = expandedId === v.id
          const nombre = (v.f1_nombre || '').trim() || 'Sin nombre'
          return (
            <div key={v.id} className="card">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : v.id)}
              >
                <div>
                  <span className="font-semibold text-sm text-gray-800">{nombre}</span>
                  <p className="text-xs text-gray-500">
                    {v.vt_fecha_visita || 'Sin fecha'}{v.vt_nombre_apiario ? ` · ${v.vt_nombre_apiario}` : ''}
                  </p>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600 space-y-1.5">
                  {v.vt_nombre_tecnico && <p><strong>Técnico:</strong> {v.vt_nombre_tecnico}</p>}
                  <p><strong>RUT:</strong> {v.f3_rut || 'N/A'}</p>
                  <p><strong>Teléfono:</strong> {v.f4_telefono || 'N/A'}</p>
                  <p><strong>Correo:</strong> {v.f5_email || 'N/A'}</p>
                  <p><strong>Dirección/sector:</strong> {v.f9_dir_propiedad || 'N/A'}</p>
                  <p><strong>Comuna:</strong> {v.f7_comuna || 'N/A'}</p>

                  <p className="pt-1 font-semibold text-gray-700">Datos del apiario</p>
                  {v.vt_nombre_apiario && <p><strong>Apiario:</strong> {v.vt_nombre_apiario}</p>}
                  {v.vt_num_colmenas && <p><strong>N° colmenas:</strong> {v.vt_num_colmenas}</p>}
                  {v.vt_actividad_principal && <p><strong>Actividad principal:</strong> {v.vt_actividad_principal}</p>}

                  <p className="pt-1 font-semibold text-gray-700">Condición sanitaria</p>
                  {v.vt_varroa_pct && <p><strong>Varroa (%):</strong> {v.vt_varroa_pct}</p>}
                  {v.vt_enfermedades && <p className="whitespace-pre-wrap"><strong>Enfermedades:</strong> {v.vt_enfermedades}</p>}
                  {v.vt_tratamientos && <p className="whitespace-pre-wrap"><strong>Tratamientos:</strong> {v.vt_tratamientos}</p>}
                  {v.vt_fecha_ultimo_tratamiento && <p><strong>Último tratamiento:</strong> {v.vt_fecha_ultimo_tratamiento}</p>}

                  <p className="pt-1 font-semibold text-gray-700">Producción</p>
                  {v.vt_prod_anterior && <p><strong>Temporada anterior (kg):</strong> {v.vt_prod_anterior}</p>}
                  {v.vt_prod_estimada && <p><strong>Estimada actual (kg):</strong> {v.vt_prod_estimada}</p>}
                  {v.vt_tipo_miel && <p><strong>Tipo de miel:</strong> {v.vt_tipo_miel}</p>}

                  <p className="pt-1 font-semibold text-gray-700">Manejo técnico</p>
                  {v.vt_alimentacion && <p><strong>Alimentación:</strong> {v.vt_alimentacion}</p>}
                  {v.vt_renovacion_reinas && <p><strong>Renovación reinas (%):</strong> {v.vt_renovacion_reinas}</p>}
                  {v.vt_recambio_marcos && <p><strong>Recambio marcos (%):</strong> {v.vt_recambio_marcos}</p>}
                  {v.vt_calendario_manejo && <p><strong>Calendario de manejo:</strong> {v.vt_calendario_manejo}</p>}

                  <p className="pt-1 font-semibold text-gray-700">Observaciones</p>
                  {v.vt_problemas && <p className="whitespace-pre-wrap"><strong>Problemas detectados:</strong> {v.vt_problemas}</p>}
                  {v.vt_recomendaciones && <p className="whitespace-pre-wrap"><strong>Recomendaciones:</strong> {v.vt_recomendaciones}</p>}
                  {v.vt_compromisos && <p className="whitespace-pre-wrap"><strong>Compromisos:</strong> {v.vt_compromisos}</p>}
                  {v.vt_fecha_proxima_visita && <p><strong>Próxima visita:</strong> {v.vt_fecha_proxima_visita}</p>}

                  {v.vt_informe && <p className="whitespace-pre-wrap"><strong>Informe:</strong> {v.vt_informe}</p>}

                  {(v.vt_firma_tecnico || v.vt_firma_apicultor) && (
                    <p><strong>Firmas:</strong> {v.vt_firma_tecnico || '—'} / {v.vt_firma_apicultor || '—'}</p>
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
