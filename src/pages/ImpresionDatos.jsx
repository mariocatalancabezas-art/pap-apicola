import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Check, FileDown, Loader2, Printer, Search, Share2, Trash2, X,
} from 'lucide-react'
import { db } from '../lib/db'
import { listProyectos } from '../lib/proyectosInversion'
import {
  calcularAnchosColumnasPDF,
  exportarPDF,
  generarPDFBlob,
  compartirPDF,
} from '../lib/planillaPdf'
import {
  CAMPOS_IMPRESION, findCampo, getCampoValue, nombreCompleto,
  normalizarNombre, normalizarRut,
} from '../lib/impresionDatos'

const TITULO = 'Impresión de Datos Apicultores'
const CAMPO_INICIAL = 'apicultor.rut'

function diagnosticoDe(apicultor, diagnosticos) {
  const rut = normalizarRut(apicultor.rut)
  const nombre = normalizarNombre(nombreCompleto(apicultor))
  const coincidencias = diagnosticos.filter(diagnostico => {
    const diagnosticoRut = normalizarRut(diagnostico.f3_rut)
    if (rut && diagnosticoRut) return rut === diagnosticoRut
    return normalizarNombre(
      `${diagnostico.f1_nombre || ''} ${diagnostico.f2_apellido || ''}`,
    ) === nombre
  })
  return coincidencias.sort((a, b) => {
    const fechaA = a.f19_fecha_encuesta || ''
    const fechaB = b.f19_fecha_encuesta || ''
    if (fechaA !== fechaB) return fechaB.localeCompare(fechaA)
    return new Date(b.created_at || 0) - new Date(a.created_at || 0)
  })[0] || null
}

function proyectoDe(apicultor, proyectos) {
  const rut = normalizarRut(apicultor.rut)
  const nombre = normalizarNombre(nombreCompleto(apicultor))
  return proyectos.find(proyecto => {
    const proyectoRut = normalizarRut(proyecto.apicultor_rut)
    if (rut && proyectoRut) return rut === proyectoRut
    return normalizarNombre(proyecto.apicultor_nombre) === nombre
  }) || null
}

function CampoModal({ onClose, onSelect, selectedKey }) {
  const [search, setSearch] = useState('')
  const query = normalizarNombre(search)
  const groups = CAMPOS_IMPRESION.map(group => ({
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

export default function ImpresionDatos() {
  const navigate = useNavigate()
  const [apicultores, setApicultores] = useState([])
  const [diagnosticos, setDiagnosticos] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [projectError, setProjectError] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [search, setSearch] = useState('')
  const [columns, setColumns] = useState([{ id: 1, fieldKey: CAMPO_INICIAL }])
  const [nextColumnId, setNextColumnId] = useState(2)
  const [editingColumn, setEditingColumn] = useState(null)
  const [orientation, setOrientation] = useState('portrait')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const [allApicultores, allDiagnosticos] = await Promise.all([
        db.apicultores.filter(apicultor => !apicultor.deleted_at).sortBy('nombre_completo'),
        db.visitas.filter(diagnostico => !diagnostico.deleted_at).toArray(),
      ])
      const seen = new Set()
      const uniqueApicultores = allApicultores.filter(apicultor => {
        const key = normalizarNombre(nombreCompleto(apicultor))
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
      if (!active) return
      setApicultores(uniqueApicultores)
      setDiagnosticos(allDiagnosticos.filter(diagnostico => (
        diagnostico.tipo_visita !== 'administrativa'
        && diagnostico.tipo_visita !== 'tecnica'
      )))
      setSelectedIds(new Set(uniqueApicultores.map(apicultor => apicultor.id)))
      setLoading(false)
      try {
        const loadedProjects = await listProyectos()
        if (active) setProyectos(loadedProjects)
      } catch (error) {
        if (active) setProjectError(error.message)
      }
    }
    load().catch(error => {
      console.error(error)
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  const filteredApicultores = useMemo(() => {
    const query = normalizarNombre(search)
    const rutQuery = normalizarRut(search)
    if (!query) return apicultores
    return apicultores.filter(apicultor => (
      normalizarNombre(nombreCompleto(apicultor)).includes(query)
      || (rutQuery && normalizarRut(apicultor.rut).includes(rutQuery))
    ))
  }, [apicultores, search])

  const selectedApicultores = useMemo(() => (
    apicultores
      .filter(apicultor => selectedIds.has(apicultor.id))
      .sort((a, b) => normalizarNombre(nombreCompleto(a)).localeCompare(normalizarNombre(nombreCompleto(b))))
  ), [apicultores, selectedIds])

  const rows = useMemo(() => selectedApicultores.map(apicultor => {
    const diagnostico = diagnosticoDe(apicultor, diagnosticos)
    const proyecto = proyectoDe(apicultor, proyectos)
    return {
      apicultor,
      diagnostico,
      proyecto,
      values: columns.map(column => getCampoValue(apicultor, diagnostico, proyecto, column.fieldKey)),
    }
  }), [columns, diagnosticos, proyectos, selectedApicultores])

  function toggleSelected(id) {
    setSelectedIds(previous => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectVisible() {
    setSelectedIds(previous => new Set([
      ...previous,
      ...filteredApicultores.map(apicultor => apicultor.id),
    ]))
  }

  function clearVisible() {
    setSelectedIds(previous => {
      const next = new Set(previous)
      filteredApicultores.forEach(apicultor => next.delete(apicultor.id))
      return next
    })
  }

  function addColumn() {
    setColumns(previous => [...previous, { id: nextColumnId, fieldKey: CAMPO_INICIAL }])
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

  function pdfData() {
    const columnas = ['N°', 'NOMBRE DEL APICULTOR', ...columns.map(column => findCampo(column.fieldKey)?.label || '')]
    const filas = rows.map((row, index) => [
      String(index + 1),
      nombreCompleto(row.apicultor),
      ...row.values,
    ])
    const columnStyles = calcularAnchosColumnasPDF({
      cantidadConfigurables: columns.length,
      orientation,
    })
    return {
      columnas,
      filas,
      columnStyles,
      horizontalPageBreak: true,
      horizontalPageBreakRepeat: [0, 1],
    }
  }

  function descargarPDF() {
    const {
      columnas,
      filas,
      columnStyles,
      horizontalPageBreak,
      horizontalPageBreakRepeat,
    } = pdfData()
    exportarPDF({
      titulo: TITULO,
      columnas,
      filas,
      columnStyles,
      rowHeight: 7,
      orientation,
      horizontalPageBreak,
      horizontalPageBreakRepeat,
    })
  }

  async function compartir() {
    const {
      columnas,
      filas,
      columnStyles,
      horizontalPageBreak,
      horizontalPageBreakRepeat,
    } = pdfData()
    const { blob, nombreFinal } = await generarPDFBlob({
      titulo: TITULO,
      columnas,
      filas,
      columnStyles,
      rowHeight: 7,
      orientation,
      horizontalPageBreak,
      horizontalPageBreakRepeat,
    })
    const ok = await compartirPDF(blob, TITULO, nombreFinal)
    if (!ok) alert('Tu navegador no soporta compartir archivos. Descarga el PDF y envíalo manualmente.')
  }

  return (
    <div className="space-y-4 p-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/historial')}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold">{TITULO}</h2>
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
              placeholder="Buscar apicultor por nombre o RUT"
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
          {filteredApicultores.map(apicultor => (
            <label key={apicultor.id} className="flex items-center gap-2 rounded p-2 text-sm hover:bg-honey-50">
              <input
                type="checkbox"
                checked={selectedIds.has(apicultor.id)}
                onChange={() => toggleSelected(apicultor.id)}
              />
              <span>
                {nombreCompleto(apicultor)}
                {apicultor.rut && <span className="ml-1 text-xs text-gray-500">· {apicultor.rut}</span>}
              </span>
            </label>
          ))}
          {filteredApicultores.length === 0 && <p className="p-2 text-sm text-gray-500">No hay coincidencias.</p>}
        </div>
        {projectError && (
          <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            No se pudieron cargar los proyectos; se mostrará “Sin proyecto”. {projectError}
          </div>
        )}
      </div>

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
                  <th colSpan={columns.length + 3} />
                </tr>
                <tr>
                  <th className="w-12">N°</th>
                  <th className="whitespace-nowrap">Nombre del apicultor</th>
                  {columns.map(column => {
                    const field = findCampo(column.fieldKey)
                    return (
                      <th
                        key={column.id}
                        className="min-w-40 cursor-pointer"
                        onClick={() => setEditingColumn(column.id)}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>{field?.label}</span>
                          <button
                            type="button"
                            className="no-print rounded p-1 text-red-500 hover:bg-red-50"
                            title="Eliminar columna"
                            onClick={event => {
                              event.stopPropagation()
                              removeColumn(column.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
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
                <tr><td colSpan={columns.length + 3} /></tr>
              </tfoot>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.apicultor.id}
                    style={(index + 1) % 20 === 0 && index + 1 !== rows.length
                      ? { breakAfter: 'page' }
                      : undefined}
                  >
                    <td className="text-center">{index + 1}</td>
                    <td className="whitespace-nowrap">{nombreCompleto(row.apicultor)}</td>
                    {row.values.map((value, valueIndex) => <td key={`${row.apicultor.id}-${valueIndex}`}>{value}</td>)}
                    <td className="no-print" />
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 3} className="py-4 text-center text-gray-500">
                      No hay apicultores seleccionados.
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
