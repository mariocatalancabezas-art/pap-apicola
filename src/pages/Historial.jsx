import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileSpreadsheet, FileText, Trash2, ChevronDown, ChevronUp, Printer, Database, Pencil, GitFork } from 'lucide-react'
import { db, SYNC_STATUS } from '../lib/db'
import { exportPDF, exportExcel, exportVisitaPDF, exportVisitaExcel, exportBaseDatos, printVisitaPDF } from '../lib/exports'
import BreachasModal from '../components/BreachasModal'

export default function Historial() {
  const navigate = useNavigate()
  const [visitas, setVisitas] = useState([])
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [filtroRegion, setFiltroRegion] = useState('')
  const [brechasVisita, setBrechasVisita] = useState(null)

  const load = useCallback(async () => {
    const vs = await db.visitas.orderBy('f19_fecha_encuesta').reverse().toArray()
    setVisitas(vs)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = visitas.filter(v2 => {
    const nombre = `${v2.f1_nombre || ''} ${v2.f2_apellido || ''}`.toLowerCase()
    const matchSearch = !search ||
      nombre.includes(search.toLowerCase()) ||
      (v2.f3_rut || '').toLowerCase().includes(search.toLowerCase()) ||
      (v2.f15_poder_comprador || '').toLowerCase().includes(search.toLowerCase()) ||
      (v2.f24_especie_principal || '').toLowerCase().includes(search.toLowerCase())
    const matchDesde = !filtroDesde || (v2.f19_fecha_encuesta || '') >= filtroDesde
    const matchHasta = !filtroHasta || (v2.f19_fecha_encuesta || '') <= filtroHasta
    const matchRegion = !filtroRegion || v2.f6_region === filtroRegion
    return matchSearch && matchDesde && matchHasta && matchRegion
  })

  async function handleBrechasChange(e) {
    const { name, value } = e.target
    setBrechasVisita(v => ({ ...v, [name]: value }))
  }

  async function persistBrechas(v) {
    await db.visitas.update(v.id, {
      brechas_pc1: v.brechas_pc1, brechas_tipo_pc1: v.brechas_tipo_pc1,
      brechas_solucion_pc1: v.brechas_solucion_pc1, brechas_inversion_pc1: v.brechas_inversion_pc1,
      brechas_pc2: v.brechas_pc2, brechas_tipo_pc2: v.brechas_tipo_pc2,
      brechas_solucion_pc2: v.brechas_solucion_pc2, brechas_inversion_pc2: v.brechas_inversion_pc2,
      brechas_pc3: v.brechas_pc3, brechas_tipo_pc3: v.brechas_tipo_pc3,
      brechas_solucion_pc3: v.brechas_solucion_pc3, brechas_inversion_pc3: v.brechas_inversion_pc3,
      brechas_pc4: v.brechas_pc4, brechas_tipo_pc4: v.brechas_tipo_pc4,
      brechas_solucion_pc4: v.brechas_solucion_pc4, brechas_inversion_pc4: v.brechas_inversion_pc4,
      brechas_pc5: v.brechas_pc5, brechas_tipo_pc5: v.brechas_tipo_pc5,
      brechas_solucion_pc5: v.brechas_solucion_pc5, brechas_inversion_pc5: v.brechas_inversion_pc5,
      brechas_nota: v.brechas_nota,
      sync_status: SYNC_STATUS.PENDING,
      updated_at: new Date().toISOString(),
    })
    load()
  }

  async function saveBrechas() {
    if (!brechasVisita) return
    await persistBrechas(brechasVisita)
    setBrechasVisita(null)
  }

  async function saveBrechasOnly() {
    if (!brechasVisita) return
    await persistBrechas(brechasVisita)
  }

  async function deleteVisita(id) {
    if (!confirm('¿Eliminar este diagnóstico?')) return
    await db.visitas.delete(id)
    load()
  }

  function syncBadge(status) {
    if (status === SYNC_STATUS.SYNCED) return <span className="badge-synced">✓ Sync</span>
    if (status === SYNC_STATUS.PENDING) return <span className="badge-pending">⏳ Pendiente</span>
    return <span className="badge-offline">✗ Error</span>
  }

  const regiones = [...new Set(visitas.map(v2 => v2.f6_region).filter(Boolean))].sort()

  return (
    <>
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Historial de diagnósticos</h2>
        <div className="flex gap-1.5">
          <button
            onClick={() => exportBaseDatos(visitas)}
            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
            title="Exportar Base de Datos completa"
          >
            <Database className="w-4 h-4" />
          </button>
          <button
            onClick={() => exportExcel(filtered)}
            className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"
            title="Exportar Excel (filtrados)"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
          <button
            onClick={() => exportPDF(filtered)}
            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
            title="Exportar PDF resumen"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar nombre, RUT, especie, empresa…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <select value={filtroRegion} onChange={e => setFiltroRegion(e.target.value)} className="input-field">
          <option value="">Todas las regiones</option>
          {regiones.map(r => <option key={r}>{r}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} className="input-field" />
          <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} className="input-field" />
        </div>
      </div>

      <p className="text-sm text-gray-500">{filtered.length} diagnóstico{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>

      {filtered.length === 0 && (
        <div className="card text-center py-8 text-gray-400">
          <p className="text-4xl mb-2">📋</p>
          <p>No hay diagnósticos registrados</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(v2 => {
          const isExpanded = expandedId === v2.id
          const nombre = `${v2.f1_nombre || ''} ${v2.f2_apellido || ''}`.trim() || 'Sin nombre'
          return (
            <div key={v2.id} className="card">
              <div
                className="flex items-start justify-between cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : v2.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-800">{nombre}</span>
                    {syncBadge(v2.sync_status)}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {v2.f19_fecha_encuesta} · {v2.f6_region}{v2.f7_comuna ? ` · ${v2.f7_comuna}` : ''}
                  </p>
                  <p className="text-xs text-gray-400">
                    {v2.f24_especie_principal && `🌿 ${v2.f24_especie_principal}`}
                    {v2.f15_poder_comprador && ` · ${v2.f15_poder_comprador}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {v2.f3_rut && <p><span className="text-gray-400">RUT:</span> {v2.f3_rut}</p>}
                    {v2.f4_telefono && <p><span className="text-gray-400">Tel:</span> {v2.f4_telefono}</p>}
                    {v2.f16_rubro_negocio && <p><span className="text-gray-400">Rubro:</span> {v2.f16_rubro_negocio}</p>}
                    {v2.f18_programa_indap && <p><span className="text-gray-400">INDAP:</span> {v2.f18_programa_indap}</p>}
                    {v2.f64_ingresos_totales && <p><span className="text-gray-400">Ingresos:</span> ${Number(v2.f64_ingresos_totales).toLocaleString('es-CL')}</p>}
                    {v2.f66_margen_bruto && <p><span className="text-gray-400">Margen:</span> ${Number(v2.f66_margen_bruto).toLocaleString('es-CL')}</p>}
                    {v2.f76_nivel_comercial && <p><span className="text-gray-400">N.Comercial:</span> {v2.f76_nivel_comercial}</p>}
                    {v2.f77_nivel_productivo && <p><span className="text-gray-400">N.Productivo:</span> {v2.f77_nivel_productivo}</p>}
                  </div>

                  {/* Acciones por visita */}
                  <div className="flex gap-2 pt-2 flex-wrap">
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/visita/editar/${v2.id}`) }}
                      className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg font-medium"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setBrechasVisita({ ...v2 }) }}
                      className="flex items-center gap-1.5 text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 px-3 py-1.5 rounded-lg font-medium"
                    >
                      <GitFork className="w-3.5 h-3.5" /> Brechas
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); exportVisitaPDF(v2) }}
                      className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium"
                    >
                      <FileText className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); exportVisitaExcel(v2) }}
                      className="flex items-center gap-1.5 text-xs bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-lg font-medium"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); printVisitaPDF(v2) }}
                      className="flex items-center gap-1.5 text-xs bg-gray-50 text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg font-medium"
                    >
                      <Printer className="w-3.5 h-3.5" /> Imprimir
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteVisita(v2.id) }}
                      className="flex items-center gap-1.5 text-xs bg-red-50 text-red-500 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>

    {brechasVisita && (
      <BreachasModal
        form={brechasVisita}
        onChange={handleBrechasChange}
        onSave={saveBrechasOnly}
        onClose={saveBrechas}
      />
    )}
    </>
  )
}
