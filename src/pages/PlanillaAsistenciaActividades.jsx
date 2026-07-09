import React, { useEffect, useState } from 'react'
import { ArrowLeft, Printer, FileDown, Share2, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { db } from '../lib/db'
import { exportarPDF, generarPDFBlob, compartirPDF } from '../lib/planillaPdf'

function formatearRut(rut) {
  if (!rut) return ''
  const limpio = String(rut).replace(/[^0-9kK]/g, '').toUpperCase()
  if (limpio.length < 2) return rut
  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  const formateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formateado}-${dv}`
}

function nombreCompleto(a) {
  return (a.nombre_completo || `${a.nombres || ''} ${a.apellidos || ''}`).trim()
}

export default function PlanillaAsistenciaActividades() {
  const navigate = useNavigate()
  const [apicultores, setApicultores] = useState([])
  const [loading, setLoading] = useState(true)

  async function cargar() {
    setLoading(true)
    try {
      const all = await db.apicultores
        .filter(a => !a.deleted_at)
        .sortBy('nombre_completo')
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
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const columnas = ['N°', 'NOMBRE', 'RUT', 'TELÉFONO', 'CORREO', 'FIRMA']
  const filas = apicultores.map((a, idx) => [
    String(idx + 1),
    nombreCompleto(a),
    formatearRut(a.rut),
    a.telefono || '',
    (a.email || '').toLowerCase(),
    '',
  ])

  function descargarPDF() {
    exportarPDF({
      titulo: 'Asistencia Actividades Apicultores',
      subtitulos: [
        { label: 'Nombre de la actividad', valor: '' },
        { label: 'Fecha', valor: '' },
      ],
      columnas,
      filas,
      columnStyles: { 1: { cellWidth: 60 }, 3: { cellWidth: 22 }, 5: { cellWidth: 52 } },
      rowHeight: 7,
    })
  }

  async function compartir() {
    const { blob, nombreFinal } = await generarPDFBlob({
      titulo: 'Asistencia Actividades Apicultores',
      subtitulos: [
        { label: 'Nombre de la actividad', valor: '' },
        { label: 'Fecha', valor: '' },
      ],
      columnas,
      filas,
      columnStyles: { 1: { cellWidth: 60 }, 3: { cellWidth: 22 }, 5: { cellWidth: 52 } },
      rowHeight: 7,
    })
    const ok = await compartirPDF(blob, 'Asistencia Actividades Apicultores', nombreFinal)
    if (!ok) alert('Tu navegador no soporta compartir archivos. Descarga el PDF y envíalo manualmente.')
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 no-print flex-wrap">
        <button
          onClick={() => navigate('/otras-planillas')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold">Asistencia Actividades Apicultores</h2>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-honey-100 text-honey-700 hover:bg-honey-200 text-sm font-medium"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
          <button
            onClick={descargarPDF}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium"
          >
            <FileDown className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={compartir}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-medium"
          >
            <Share2 className="w-4 h-4" /> Compartir
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 no-print">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="planilla-sheet print-landscape">
          <div className="planilla-exec-header">
            <img src="/Logo/LOGO%20ASB.png.png" alt="ASB" />
            <div className="peh-title">
              <h1>Asistencia Actividades Apicultores</h1>
              <p>PAP Apícola</p>
            </div>
            <img src="/Logo/LOGO%20INDAP.png" alt="INDAP" />
          </div>
          <div className="planilla-campos mt-10 mb-8">
            <div className="flex justify-center gap-8 text-sm">
              <div className="flex items-end gap-2">
                <span className="font-semibold leading-none whitespace-nowrap">Nombre de la actividad:</span>
                <span className="inline-block border-b border-black w-56 translate-y-1" />
              </div>
              <div className="flex items-end gap-2">
                <span className="font-semibold leading-none whitespace-nowrap">Fecha:</span>
                <span className="inline-block border-b border-black w-40 translate-y-1" />
              </div>
            </div>
          </div>

          <table className="planilla-table filas-llenas">
            <thead>
              <tr className="print-pad-row"><th colSpan={6} /></tr>
              <tr>
                <th className="w-12">N°</th>
                <th className="col-nombre">NOMBRE</th>
                <th className="w-28 whitespace-nowrap">RUT</th>
                <th className="w-24 whitespace-nowrap">TELÉFONO</th>
                <th className="w-40">CORREO</th>
                <th className="w-56">FIRMA</th>
              </tr>
            </thead>
            <tfoot className="print-pad-foot"><tr><td colSpan={6} /></tr></tfoot>
            <tbody>
              {apicultores.map((a, idx) => (
                <tr
                  key={a.id}
                  style={(idx + 1) % 20 === 0 && idx + 1 !== apicultores.length ? { breakAfter: 'page' } : undefined}
                >
                  <td className="text-center">{idx + 1}</td>
                  <td className="col-nombre">{nombreCompleto(a)}</td>
                  <td className="text-center whitespace-nowrap">{formatearRut(a.rut)}</td>
                  <td className="whitespace-nowrap">{a.telefono || ''}</td>
                  <td>{a.email || ''}</td>
                  <td />
                </tr>
              ))}
              {apicultores.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-4">
                    No hay apicultores registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
