import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Check, FileDown, Loader2, Printer,
  Search, Share2, Trash2, X,
} from 'lucide-react'
import { ANIOS_PROYECTO, listProyectos } from '../lib/proyectosInversion'
import {
  exportarPDF,
  generarPDFBlob,
  compartirPDF,
} from '../lib/planillaPdf'
import {
  CAMPOS_PROYECTO, findCampoProyecto, getValorProyecto,
} from '../lib/impresionProyectos'
import { normalizarNombre, normalizarRut } from '../lib/impresionDatos'
import { useAuth } from '../lib/AuthContext'

const CAMPO_INICIAL = 'nombre_proyecto'

function compararValores(valorA, valorB, dir) {
  const textoA = String(valorA || '').trim()
  const textoB = String(valorB || '').trim()
  if (!textoA && !textoB) return 0
  if (!textoA) return 1
  if (!textoB) return -1

  const esNumero = valor => /^-?\$?\s*[\d.,\s]+$/.test(valor)
  const comparacion = esNumero(textoA) && esNumero(textoB)
    ? Number(textoA.replace(/[^\d-]/g, '')) - Number(textoB.replace(/[^\d-]/g, ''))
    : textoA.localeCompare(textoB, 'es', { sensitivity: 'base', numeric: true })
  return dir === 'asc' ? comparacion : -comparacion
}

function CampoModal({ onClose, onSelect, selectedKey }) {
  const [search, setSearch] = useState('')
  const query = normalizarNombre(search)
  const groups = CAMPOS_PROYECTO.map(group => ({
    ...group,
    fields: group.fields.filter(field => (
      !query
      || normalizarNombre(field.label).includes(query)
      || normalizarNombre(field.key).includes(query)
    )),
  })).filter(group => group.fields.length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="font-bold">Seleccionar campo</h2>
            <p className="text-xs text-gray-500">Busca por nombre o clave del campo.</p>
          </div>
          <button type="button" className="rounded p-1 hover:bg-gray-100" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="border-b p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              className="input-field w-full pl-9"
              placeholder="Buscar información en los campos..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
        </div>
        <div className="overflow-y-auto p-4">
          {groups.length === 0 && <p className="text-sm text-gray-500">No hay campos que coincidan.</p>}
          <div className="space-y-4">
            {groups.map(group => (
              <section key={group.key}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-honey-700">
                  {group.label}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.fields.map(field => (
                    <button
                      type="button"
                      key={field.key}
                      className={`rounded-lg border p-3 text-left text-sm hover:border-honey-400 hover:bg-honey-50 ${
                        selectedKey === field.key ? 'border-honey-500 bg-honey-50' : 'border-gray-200'
                      }`}
                      onClick={() => onSelect(field.key)}
                    >
                      <span className="block font-medium">{field.label}</span>
                      <span className="mt-1 block text-xs text-gray-400">{field.key}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ImpresionProyectos() {
  const navigate = useNavigate()
  const { anio: anioParam } = useParams()
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin'
  const puedeVer = isAdmin || !!user?.puede_ver_proyectos_inversion
  const anio = Number(anioParam)
  const anioValido = ANIOS_PROYECTO.includes(anio)
  const TITULO = `Proyectos de Inversión ${anio}`

  const [proyectos, setProyectos] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [search, setSearch] = useState('')
  const [columns, setColumns] = useState([{ id: 1, fieldKey: CAMPO_INICIAL }])
  const [nextColumnId, setNextColumnId] = useState(2)
  const [editingColumn, setEditingColumn] = useState(null)
  const [orientation, setOrientation] = useState('landscape')
  const [sort, setSort] = useState({ key: 'nombre', dir: 'asc' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const lista = await listProyectos(anio)
        if (!active) return
        setProyectos(lista)
        setSelectedIds(new Set(lista.map(p => p.id)))
      } catch (e) {
        if (active) setError(e.message)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [anio])

  const filtered = useMemo(() => {
    const query = normalizarNombre(search)
    if (!query) return proyectos
    return proyectos.filter(p => (
      normalizarNombre(p.apicultor_nombre).includes(query)
      || normalizarNombre(p.nombre_proyecto).includes(query)
      || normalizarRut(p.apicultor_rut).includes(normalizarRut(search))
    ))
  }, [proyectos, search])

  const allRows = useMemo(() => filtered.map(proyecto => ({
    proyecto,
    values: columns.map(column => getValorProyecto(proyecto, column.fieldKey)),
  })), [filtered, columns])

  const sortedRows = useMemo(() => {
    const columnIndex = sort.key.startsWith('col-')
      ? columns.findIndex(column => `col-${column.id}` === sort.key)
      : -1
    return allRows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const valueA = sort.key === 'nombre' ? a.row.proyecto.apicultor_nombre : a.row.values[columnIndex]
        const valueB = sort.key === 'nombre' ? b.row.proyecto.apicultor_nombre : b.row.values[columnIndex]
        return compararValores(valueA, valueB, sort.dir)
          || compararValores(a.row.proyecto.apicultor_nombre, b.row.proyecto.apicultor_nombre, 'asc')
          || a.index - b.index
      })
      .map(entry => entry.row)
  }, [allRows, columns, sort])

  const selectedRows = useMemo(
    () => sortedRows.filter(row => selectedIds.has(row.proyecto.id)),
    [selectedIds, sortedRows],
  )

  const selectedNumbers = useMemo(
    () => new Map(selectedRows.map((row, index) => [row.proyecto.id, index + 1])),
    [selectedRows],
  )

  function toggleSelected(id) {
    setSelectedIds(previous => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectVisible() {
    setSelectedIds(previous => new Set([...previous, ...filtered.map(p => p.id)]))
  }

  function clearVisible() {
    setSelectedIds(previous => {
      const next = new Set(previous)
      filtered.forEach(p => next.delete(p.id))
      return next
    })
  }

  function addColumn() {
    setColumns(previous => [...previous, { id: nextColumnId, fieldKey: '' }])
    setNextColumnId(previous => previous + 1)
  }

  function removeColumn(id) {
    setColumns(previous => previous.filter(column => column.id !== id))
  }

  function changeColumn(id, fieldKey) {
    setColumns(previous => previous.map(column => (
      column.id === id ? { ...column, fieldKey } : column
    )))
    setEditingColumn(null)
  }

  function cycleSort(key) {
    setSort(previous => (
      previous.key === key && previous.dir === 'asc'
        ? { key, dir: 'desc' }
        : { key, dir: 'asc' }
    ))
  }

  function sortIcon(key) {
    if (sort.key !== key) return <ArrowUpDown className="h-3 w-3" />
    return sort.dir === 'asc'
      ? <ArrowUp className="h-3 w-3" />
      : <ArrowDown className="h-3 w-3" />
  }

  function pdfData() {
    const columnas = [
      'N°',
      'NOMBRE DEL POSTULANTE',
      ...columns.map(column => findCampoProyecto(column.fieldKey)?.label || 'Seleccionar'),
    ]
    const filas = selectedRows.map((row, index) => [
      String(index + 1),
      row.proyecto.apicultor_nombre || '',
      ...row.values.map(v => String(v ?? '')),
    ])
    return {
      columnas,
      filas,
      columnStyles: { 0: { cellWidth: 8 } },
      horizontalPageBreak: true,
      horizontalPageBreakRepeat: [0, 1],
      rowPageBreak: 'auto',
      headFontSize: 10,
    }
  }

  function descargarPDF() {
    const { columnas, filas, columnStyles, horizontalPageBreak, horizontalPageBreakRepeat, rowPageBreak, headFontSize } = pdfData()
    exportarPDF({
      titulo: TITULO,
      columnas,
      filas,
      columnStyles,
      rowHeight: 7,
      orientation,
      horizontalPageBreak,
      horizontalPageBreakRepeat,
      rowPageBreak,
      headFontSize,
    })
  }

  async function compartir() {
    const { columnas, filas, columnStyles, horizontalPageBreak, horizontalPageBreakRepeat, rowPageBreak, headFontSize } = pdfData()
    const { blob, nombreFinal } = await generarPDFBlob({
      titulo: TITULO,
      columnas,
      filas,
      columnStyles,
      rowHeight: 7,
      orientation,
      horizontalPageBreak,
      horizontalPageBreakRepeat,
      rowPageBreak,
      headFontSize,
    })
    const ok = await compartirPDF(blob, TITULO, nombreFinal)
    if (!ok) alert('Tu navegador no soporta compartir archivos. Descarga el PDF y envíalo manualmente.')
  }

  if (!puedeVer) {
    return (
      <div className="p-4">
        <div className="card bg-red-50 border-red-200 text-red-700 text-sm">
          No tienes permisos para ver los proyectos de inversión.
        </div>
      </div>
    )
  }

  if (!anioValido) {
    return (
      <div className="p-4 space-y-4">
        <button type="button" onClick={() => navigate(-1)}
          className="p-1 rounded-lg hover:bg-gray-100" title="Volver">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="card bg-red-50 border-red-200 text-red-700 text-sm">Año no válido.</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(`/proyectos-inversion/anio/${anio}`)}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold">Impresión — {TITULO}</h2>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              orientation === 'portrait' ? 'bg-honey-200 text-honey-800' : 'bg-gray-100 text-gray-600'
            }`}
            onClick={() => setOrientation('portrait')}
          >
            Vertical
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              orientation === 'landscape' ? 'bg-honey-200 text-honey-800' : 'bg-gray-100 text-gray-600'
            }`}
            onClick={() => setOrientation('landscape')}
          >
            Horizontal
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1 rounded-lg bg-honey-100 px-3 py-2 text-sm font-medium text-honey-700 hover:bg-honey-200"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
          <button
            type="button"
            onClick={descargarPDF}
            className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <FileDown className="w-4 h-4" /> PDF
          </button>
          <button
            type="button"
            onClick={compartir}
            className="flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200"
          >
            <Share2 className="w-4 h-4" /> Compartir
          </button>
        </div>
      </div>

      <div className="no-print card space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[16rem] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field w-full pl-9"
              placeholder="Buscar por postulante, proyecto o RUT"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
          <button type="button" className="btn-secondary" onClick={selectVisible}>
            <Check className="mr-1 inline w-4 h-4" /> Seleccionar todos
          </button>
          <button type="button" className="btn-secondary" onClick={clearVisible}>
            Quitar selección
          </button>
          <span className="text-xs text-gray-500">
            {selectedIds.size} seleccionados
          </span>
        </div>
        <div className="grid max-h-52 gap-2 overflow-y-auto rounded border p-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(proyecto => (
            <label key={proyecto.id} className="flex items-center gap-2 rounded p-2 text-sm hover:bg-honey-50">
              <input
                type="checkbox"
                checked={selectedIds.has(proyecto.id)}
                onChange={() => toggleSelected(proyecto.id)}
              />
              <span>
                {proyecto.apicultor_nombre}
                {proyecto.nombre_proyecto && <span className="ml-1 text-xs text-gray-500">· {proyecto.nombre_proyecto}</span>}
              </span>
            </label>
          ))}
          {filtered.length === 0 && <p className="p-2 text-sm text-gray-500">No hay coincidencias.</p>}
        </div>
      </div>

      {error && <div className="no-print card bg-red-50 border-red-200 text-red-700 text-sm">{error}</div>}

      {loading ? (
        <div className="no-print flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className={`planilla-sheet ${orientation === 'landscape' ? 'print-landscape' : ''}`}>
          <div className="planilla-exec-header">
            <img src="/Logo/LOGO%20ASB.png.png" alt="ASB" />
            <div className="peh-title">
              <h1>{TITULO}</h1>
              <p>PAP Apícola</p>
            </div>
            <img src="/Logo/LOGO%20INDAP.png" alt="INDAP" />
          </div>
          <div className="impresion-datos-table-wrapper overflow-x-auto">
            <table className="planilla-table filas-llenas impresion-datos-print-table">
              <thead>
                <tr className="print-pad-row">
                  <th colSpan={columns.length + 4} />
                </tr>
                <tr>
                  <th className="no-print" />
                  <th className="col-numero">N°</th>
                  <th className="col-nombre">
                    <div className="flex items-center justify-center gap-1">
                      <span>Nombre del postulante</span>
                      <button
                        type="button"
                        className="no-print rounded p-0.5 hover:bg-honey-100"
                        title="Ordenar por nombre"
                        onClick={event => {
                          event.stopPropagation()
                          cycleSort('nombre')
                        }}
                      >
                        {sortIcon('nombre')}
                      </button>
                    </div>
                  </th>
                  {columns.map(column => {
                    const field = findCampoProyecto(column.fieldKey)
                    return (
                      <th
                        key={column.id}
                        className="min-w-40 cursor-pointer"
                        onClick={() => setEditingColumn(column.id)}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>{field?.label || 'Seleccionar'}</span>
                          <button
                            type="button"
                            className="no-print rounded p-0.5 hover:bg-honey-100"
                            title="Ordenar por columna"
                            onClick={event => {
                              event.stopPropagation()
                              cycleSort(`col-${column.id}`)
                            }}
                          >
                            {sortIcon(`col-${column.id}`)}
                          </button>
                          <button
                            type="button"
                            className="no-print rounded p-2 text-red-500 hover:bg-red-50"
                            title="Eliminar columna"
                            onClick={event => {
                              event.stopPropagation()
                              removeColumn(column.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </th>
                    )
                  })}
                  <th className="no-print whitespace-nowrap">
                    <button type="button" className="btn-primary px-2 py-1 text-xs" onClick={addColumn}>
                      Nueva columna
                    </button>
                  </th>
                </tr>
              </thead>
              <tfoot className="print-pad-foot">
                <tr><td colSpan={columns.length + 4} /></tr>
              </tfoot>
              <tbody>
                {sortedRows.map(row => {
                  const isSelected = selectedIds.has(row.proyecto.id)
                  return (
                    <tr
                      key={row.proyecto.id}
                      className={isSelected ? '' : 'no-print text-gray-400 opacity-60'}
                    >
                      <td className="no-print text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(row.proyecto.id)}
                          aria-label={`Seleccionar ${row.proyecto.apicultor_nombre}`}
                        />
                      </td>
                      <td className="col-numero text-center">
                        {isSelected ? selectedNumbers.get(row.proyecto.id) : '—'}
                      </td>
                      <td className="col-nombre whitespace-nowrap">{row.proyecto.apicultor_nombre}</td>
                      {row.values.map((value, valueIndex) => (
                        <td key={`${row.proyecto.id}-${valueIndex}`} className="whitespace-pre-wrap">{value}</td>
                      ))}
                      <td className="no-print" />
                    </tr>
                  )
                })}
                {sortedRows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 4} className="py-4 text-center text-gray-500">
                      No hay proyectos registrados para este año.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingColumn !== null && (
        <CampoModal
          selectedKey={columns.find(column => column.id === editingColumn)?.fieldKey}
          onClose={() => setEditingColumn(null)}
          onSelect={fieldKey => changeColumn(editingColumn, fieldKey)}
        />
      )}
    </div>
  )
}
