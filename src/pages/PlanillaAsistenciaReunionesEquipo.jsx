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

export default function PlanillaAsistenciaReunionesEquipo() {
  const navigate = useNavigate()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)

  async function cargar() {
    setLoading(true)
    try {
      const all = await db.equipo_tecnico.filter(m => !m.deleted_at).sortBy('nombre_completo')
      setUsuarios(all || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const columnas = ['N° Item', 'Nombre', 'Rut', 'Cargo', 'Teléfono', 'Institución o Empresa', 'Firma']
  const filas = [
    ...usuarios.map((u, idx) => [
      String(idx + 1),
      u.nombre_completo || '',
      formatearRut(u.rut),
      u.cargo || '',
      u.telefono || '',
      u.institucion || '',
      '',
    ]),
    ...Array.from({ length: 4 }).map(() => [
      '', '', '', '', '', '', ''
    ]),
  ]

  function descargarPDF() {
    exportarPDF({
      titulo: 'Asistencia a Reuniones de Equipo',
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
      titulo: 'Asistencia a Reuniones de Equipo',
      subtitulos: [
        { label: 'Nombre de la actividad', valor: '' },
        { label: 'Fecha', valor: '' },
      ],
      columnas,
      filas,
    })
    const ok = await compartirPDF(blob, 'Asistencia a Reuniones de Equipo', nombreFinal)
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
        <h2 className="text-lg font-bold">Asistencia a Reuniones de Equipo</h2>
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
        <div className="planilla-sheet">
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold uppercase tracking-wide">Asistencia a Reuniones de Equipo</h1>
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
                <th className="w-12">N° Item</th>
                <th>Nombre</th>
                <th className="w-28">Rut</th>
                <th className="w-32">Cargo</th>
                <th className="w-32">Teléfono</th>
                <th className="w-40">Institución o Empresa</th>
                <th className="w-36">Firma</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u, idx) => (
                <tr key={u.id}>
                  <td className="text-center">{idx + 1}</td>
                  <td>{u.nombre_completo || ''}</td>
                  <td className="text-center">{formatearRut(u.rut)}</td>
                  <td>{u.cargo || ''}</td>
                  <td>{u.telefono || ''}</td>
                  <td>{u.institucion || ''}</td>
                  <td />
                </tr>
              ))}
              {Array.from({ length: 4 }).map((_, idx) => (
                <tr key={`blank-${idx}`}>
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-4">
                    No hay miembros del equipo registrados.
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
