import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileSpreadsheet, FileText, Trash2, ChevronDown, ChevronUp, Printer, Database, Pencil, GitFork, PlusCircle, MessageCircleQuestion, ArrowDownUp, Layers, Filter } from 'lucide-react'
import { db, SYNC_STATUS } from '../lib/db'
import { exportPDF, exportExcel, exportVisitaPDF, exportVisitaExcel, exportBaseDatos, printVisitaPDF, sharePDF, shareExcel, shareBaseDatos, shareVisitaPDF, shareVisitaExcel } from '../lib/exports'
import ShareButton from '../components/ShareButton'
import BreachasModal from '../components/BreachasModal'
import PreguntasASBModal from '../components/PreguntasASBModal'

export default function Historial() {
  const navigate = useNavigate()
  const [visitas, setVisitas] = useState([])
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [filtroRegion, setFiltroRegion] = useState('')
  const [filtroComuna, setFiltroComuna] = useState('')
  const [sortOrder, setSortOrder] = useState('desc')
  const [filtroASB, setFiltroASB] = useState('todos')
  const [agruparPor, setAgruparPor] = useState('')
  const [brechasVisita, setBrechasVisita] = useState(null)
  const [preguntasVisita, setPreguntasVisita] = useState(null)

  const load = useCallback(async () => {
    const vs = await db.visitas.orderBy('created_at').reverse().toArray()
    // Filtrar los marcados como eliminados (soft delete) y otros tipos de visita
    const activas = vs.filter(v => !v.deleted_at && v.tipo_visita !== 'administrativa' && v.tipo_visita !== 'tecnica')
    setVisitas(activas)
  }, [])

  useEffect(() => { load() }, [load])

  // Categorías ASB (tomadas de las respuestas de Preguntas ASB)
  const esMiel = v2 => v2.asb_nos_entrego_miel === 'si'
  const esSalaAutorizada = v2 => v2.asb_sala_autorizada === 'si'
  const esPorAutorizar = v2 => v2.asb_sala_autorizada === 'no' && v2.asb_sala_pronta_autorizar === 'si'
  const ASB_PRED = { miel: esMiel, autorizada: esSalaAutorizada, por_autorizar: esPorAutorizar }
  const ASB_LABEL = {
    miel: 'Nos entregó miel',
    autorizada: 'Sala autorizada',
    por_autorizar: 'Sala por autorizar',
  }

  const sortByFecha = (a, b) => {
    const da = new Date(a.created_at || 0)
    const dbb = new Date(b.created_at || 0)
    return sortOrder === 'desc' ? dbb - da : da - dbb
  }

  const filtered = visitas
    .filter(v2 => {
      const nombre = `${v2.f1_nombre || ''} ${v2.f2_apellido || ''}`.toLowerCase()
      const matchSearch = !search ||
        nombre.includes(search.toLowerCase()) ||
        (v2.f3_rut || '').toLowerCase().includes(search.toLowerCase()) ||
        (v2.f15_poder_comprador || '').toLowerCase().includes(search.toLowerCase()) ||
        (v2.f24_especie_principal || '').toLowerCase().includes(search.toLowerCase())
      const matchDesde = !filtroDesde || (v2.f19_fecha_encuesta || '') >= filtroDesde
      const matchHasta = !filtroHasta || (v2.f19_fecha_encuesta || '') <= filtroHasta
      const matchRegion = !filtroRegion || v2.f6_region === filtroRegion
      const comuna = (v2.f7_comuna || '').trim().toUpperCase()
      const matchComuna = !filtroComuna || comuna === filtroComuna
      const matchASB = filtroASB === 'todos' || (ASB_PRED[filtroASB] && ASB_PRED[filtroASB](v2))
      return matchSearch && matchDesde && matchHasta && matchRegion && matchComuna && matchASB
    })
    .sort(sortByFecha)

  // Agrupación (Sí / No) por la categoría ASB elegida; respeta el orden y lo mostrado.
  const grupos = agruparPor === 'comuna'
    ? [
        ...[...new Set(filtered
          .map(v2 => (v2.f7_comuna || '').trim().toUpperCase())
          .filter(Boolean))]
          .sort((a, b) => a.localeCompare(b, 'es-CL'))
          .map(comuna => ({
            key: `comuna-${comuna}`,
            label: `Comuna: ${comuna}`,
            items: filtered.filter(v2 => (v2.f7_comuna || '').trim().toUpperCase() === comuna),
          })),
        {
          key: 'sin-comuna',
          label: 'Sin comuna',
          items: filtered.filter(v2 => !(v2.f7_comuna || '').trim()),
        },
      ].filter(g => g.items.length > 0)
    : agruparPor
    ? [
        { key: 'si', label: `${ASB_LABEL[agruparPor]}: Sí`, items: filtered.filter(v2 => ASB_PRED[agruparPor](v2)) },
        { key: 'no', label: `${ASB_LABEL[agruparPor]}: No`, items: filtered.filter(v2 => !ASB_PRED[agruparPor](v2)) },
      ].filter(g => g.items.length > 0)
    : null

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

  async function persistPreguntasASB(v) {
    await db.visitas.update(v.id, {
      asb_anios_apicultura: v.asb_anios_apicultura,
      asb_motivacion: v.asb_motivacion,
      asb_talleres_interes: v.asb_talleres_interes,
      asb_nos_entrego_miel: v.asb_nos_entrego_miel,
      asb_sala_autorizada: v.asb_sala_autorizada,
      asb_sala_pronta_autorizar: v.asb_sala_pronta_autorizar,
      asb_que_le_falta: v.asb_que_le_falta,
      sync_status: SYNC_STATUS.PENDING,
      updated_at: new Date().toISOString(),
    })
    load()
  }

  function handlePreguntasChange(e) {
    const { name, value } = e.target
    setPreguntasVisita(v => ({ ...v, [name]: value }))
  }

  async function savePreguntas() {
    if (!preguntasVisita) return
    await persistPreguntasASB(preguntasVisita)
    setPreguntasVisita(null)
  }

  async function saveBrechasOnly() {
    if (!brechasVisita) return
    await persistBrechas(brechasVisita)
  }

  async function deleteVisita(id) {
    if (!confirm('¿Eliminar este diagnóstico?\n\nSe sincronizará la eliminación en todos los dispositivos.')) return
    
    const visita = await db.visitas.get(id)
    if (!visita) return
    
    // Soft delete: marcar como eliminado en lugar de borrar
    await db.visitas.update(id, {
      deleted_at: new Date().toISOString(),
      sync_status: 'pending',
      updated_at: new Date().toISOString()
    })
    
    // Sincronización automática completa después de eliminar
    if (navigator.onLine) {
      const { syncAll } = await import('../lib/sync')
      await syncAll(true).catch(err => console.error('Sync error:', err))
    }
    
    load()
  }

  function syncBadge(status) {
    if (status === SYNC_STATUS.SYNCED) return <span className="badge-synced">✓ Sync</span>
    if (status === SYNC_STATUS.PENDING) return <span className="badge-pending">⏳ Pendiente</span>
    return <span className="badge-offline">✗ Error</span>
  }

  const regiones = [...new Set(visitas.map(v2 => v2.f6_region).filter(Boolean))].sort()
  const comunas = [...new Set(visitas
    .map(v2 => (v2.f7_comuna || '').trim().toUpperCase())
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es-CL'))

  return (
    <>
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Historial de diagnósticos</h2>
        <div className="flex gap-1.5">
          <button
            onClick={() => navigate('/nueva-visita')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-honey-500 text-white text-sm font-medium hover:bg-honey-600"
            title="Crear nuevo diagnóstico"
          >
            <PlusCircle className="w-4 h-4" /> Nuevo Diagnóstico
          </button>
          <button
            onClick={() => exportBaseDatos(visitas)}
            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
            title="Exportar Base de Datos completa"
          >
            <Database className="w-4 h-4" />
          </button>
          <ShareButton onClick={() => shareBaseDatos(visitas)} title="Compartir Base de Datos" />
          <button
            onClick={() => exportExcel(filtered)}
            className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"
            title="Exportar Excel (filtrados)"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
          <ShareButton onClick={() => shareExcel(filtered)} title="Compartir Excel" />
          <button
            onClick={() => exportPDF(filtered)}
            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
            title="Exportar PDF resumen"
          >
            <FileText className="w-4 h-4" />
          </button>
          <ShareButton onClick={() => sharePDF(filtered)} title="Compartir PDF" />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select value={filtroRegion} onChange={e => setFiltroRegion(e.target.value)} className="input-field">
            <option value="">Todas las regiones</option>
            {regiones.map(r => <option key={r}>{r}</option>)}
          </select>
          <select value={filtroComuna} onChange={e => setFiltroComuna(e.target.value)} className="input-field">
            <option value="">Todas las comunas</option>
            {comunas.map(comuna => <option key={comuna}>{comuna}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} className="input-field" />
          <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} className="input-field" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{filtered.length} diagnóstico{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2 py-1 rounded-lg transition-colors"
          title="Cambiar orden"
        >
          <ArrowDownUp className="w-3.5 h-3.5" />
          {sortOrder === 'desc' ? 'Más reciente' : 'Más antiguo'}
        </button>
      </div>

      {/* Agrupar / Mostrar por respuestas ASB */}
      <div className="card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
              <Layers className="w-3.5 h-3.5 text-amber-600" /> Agrupar por
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(ASB_LABEL).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setAgruparPor(prev => prev === key ? '' : key)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                    agruparPor === key
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-amber-50'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => setAgruparPor(prev => prev === 'comuna' ? '' : 'comuna')}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                  agruparPor === 'comuna'
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-amber-50'
                }`}
              >
                Comuna
              </button>
              {agruparPor && (
                <button
                  onClick={() => setAgruparPor('')}
                  className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 font-medium"
                >
                  Sin agrupar
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
              <Filter className="w-3.5 h-3.5 text-green-600" /> Mostrar
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(ASB_LABEL).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFiltroASB(prev => prev === key ? 'todos' : key)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                    filtroASB === key
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-green-50'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => setFiltroASB('todos')}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                  filtroASB === 'todos'
                    ? 'bg-gray-700 text-white border-gray-700'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Mostrar todos
              </button>
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="card text-center py-8 text-gray-400">
          <img
            src="/Logo/LOGO%20ASB.png.png"
            alt="PAP Apícola"
            className="w-16 h-16 mx-auto mb-3 object-contain opacity-50"
          />
          <p>No hay diagnósticos registrados</p>
        </div>
      )}

      <div className="space-y-2">
        {(grupos || [{ key: '_all', label: null, items: filtered }]).map(grupo => (
          <div key={grupo.key} className="space-y-2">
            {grupo.label && (
              <div className="sticky top-0 z-10 bg-honey-50 text-honey-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-honey-200">
                {grupo.label} · {grupo.items.length}
              </div>
            )}
            {grupo.items.map(v2 => {
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
                      onClick={e => { e.stopPropagation(); setPreguntasVisita({ ...v2 }) }}
                      className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg font-medium"
                    >
                      <MessageCircleQuestion className="w-3.5 h-3.5" /> Preguntas ASB
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); exportVisitaPDF(v2) }}
                        className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium"
                      >
                        <FileText className="w-3.5 h-3.5" /> PDF
                      </button>
                      <ShareButton onClick={e => { e.stopPropagation(); shareVisitaPDF(v2) }} title="Compartir PDF" size="sm" />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); exportVisitaExcel(v2) }}
                        className="flex items-center gap-1.5 text-xs bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-lg font-medium"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                      </button>
                      <ShareButton onClick={e => { e.stopPropagation(); shareVisitaExcel(v2) }} title="Compartir Excel" size="sm" />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); printVisitaPDF(v2) }}
                        className="flex items-center gap-1.5 text-xs bg-gray-50 text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg font-medium"
                      >
                        <Printer className="w-3.5 h-3.5" /> Imprimir
                      </button>
                      <ShareButton onClick={e => { e.stopPropagation(); shareVisitaPDF(v2) }} title="Compartir PDF" size="sm" />
                    </div>
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
        ))}
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

    {preguntasVisita && (
      <PreguntasASBModal
        form={preguntasVisita}
        onChange={handlePreguntasChange}
        onSave={savePreguntas}
        onClose={savePreguntas}
      />
    )}
    </>
  )
}
