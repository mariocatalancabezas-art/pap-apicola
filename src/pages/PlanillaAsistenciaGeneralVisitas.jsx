import React from 'react'
import { ArrowLeft, Printer, FileDown, Share2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { exportarPDF, generarPDFBlob, compartirPDF } from '../lib/planillaPdf'

const TOTAL_ITEMS = 15

const columnas = ['N°', 'NOMBRE', 'RUT', 'TELÉFONO', 'CORREO', 'INSTITUCIÓN O EMPRESA', 'FIRMA']
const filas = Array.from({ length: TOTAL_ITEMS }).map((_, idx) => [
  String(idx + 1), '', '', '', '', '', ''
])

export default function PlanillaAsistenciaGeneralVisitas() {
  const navigate = useNavigate()

  function descargarPDF() {
    exportarPDF({
      titulo: 'Asistencia General Visitas',
      subtitulos: [
        { label: 'Nombre de la actividad', valor: '' },
        { label: 'Fecha', valor: '' },
      ],
      columnas,
      filas,
    })
  }

  async function compartir() {
    const { blob, nombreFinal } = await generarPDFBlob({
      titulo: 'Asistencia General Visitas',
      subtitulos: [
        { label: 'Nombre de la actividad', valor: '' },
        { label: 'Fecha', valor: '' },
      ],
      columnas,
      filas,
    })
    const ok = await compartirPDF(blob, 'Asistencia General Visitas', nombreFinal)
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
        <h2 className="text-lg font-bold">Asistencia General Visitas</h2>
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

      <div className="planilla-sheet">
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold uppercase tracking-wide">Asistencia General Visitas</h1>
          <div className="flex justify-center gap-8 mt-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Nombre de la actividad:</span>
              <span className="inline-block border-b border-black w-56" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Fecha:</span>
              <span className="inline-block border-b border-black w-40" />
            </div>
          </div>
        </div>

        <table className="planilla-table">
          <thead>
            <tr>
              <th className="w-12">N°</th>
              <th>NOMBRE</th>
              <th className="w-28">RUT</th>
              <th className="w-32">TELÉFONO</th>
              <th className="w-40">CORREO</th>
              <th className="w-40">INSTITUCIÓN O EMPRESA</th>
              <th className="w-36">FIRMA</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: TOTAL_ITEMS }).map((_, idx) => (
              <tr key={idx}>
                <td className="text-center">{idx + 1}</td>
                <td />
                <td />
                <td />
                <td />
                <td />
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}
