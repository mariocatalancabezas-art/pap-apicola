import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { DOCUMENTACION_REQUERIDA } from '../lib/proyectoInforme'

const ETIQUETAS_ADJUNTOS = {
  cotizacion: 'Cotizaciones',
  fotografia: 'Fotografías',
  ...Object.fromEntries(DOCUMENTACION_REQUERIDA.map(item => [item.tipo, item.label])),
}

export default function InformeProyectoPrint({
  datos,
  adjuntos = [],
  urlsImagenes = {},
  incluirAdjuntos,
  onClose,
}) {
  useEffect(() => {
    document.body.classList.add('commitment-print-active')
    const timer = setTimeout(() => window.print(), 400)
    return () => {
      clearTimeout(timer)
      document.body.classList.remove('commitment-print-active')
    }
  }, [])

  const grupos = Object.entries(
    adjuntos.reduce((resultado, archivo) => {
      const tipo = archivo.tipo || 'otros'
      if (!resultado[tipo]) resultado[tipo] = []
      resultado[tipo].push(archivo)
      return resultado
    }, {}),
  )
  const archivosNoImagen = adjuntos.filter(archivo => !archivo.mime_type?.startsWith('image/'))

  function abrirAdjunto(archivo) {
    const url = urlsImagenes[archivo.id]
    if (url) window.open(url, '_blank', 'noopener')
  }

  return createPortal(
    <div className="commitment-letter-overlay fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
      <div className="print-letter mx-auto max-w-3xl bg-white p-8">
        <div className="no-print flex flex-wrap justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
          <button className="btn-primary" onClick={() => window.print()}>Imprimir</button>
          {incluirAdjuntos && archivosNoImagen.length > 0 && (
            <div className="w-full rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <p className="mb-2">Estos adjuntos se imprimen aparte con el visor del dispositivo:</p>
              <div className="flex flex-wrap gap-2">
                {archivosNoImagen.map(archivo => (
                  <button key={archivo.id} type="button" className="btn-secondary"
                    onClick={() => abrirAdjunto(archivo)}>
                    {archivo.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <article className="prose max-w-none text-gray-900">
          <h1 className="mb-8 text-center text-xl font-bold">{datos.titulo}</h1>

          <h2>Datos del Apicultor</h2>
          {datos.datosApicultor.map(item => (
            <p key={item.label}><b>{item.label}:</b> {item.valor}</p>
          ))}

          <h2>Proyecto de Inversión</h2>
          {datos.proyecto.map(item => (
            <p key={item.label}><b>{item.label}:</b> {item.valor}</p>
          ))}

          <h2>Montos</h2>
          <table className="w-full border-collapse border border-gray-400 text-sm">
            <thead>
              <tr>
                <th className="border border-gray-400 p-2 text-left">Concepto</th>
                <th className="border border-gray-400 p-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {datos.montos.map(item => (
                <tr key={item.concepto}>
                  <td className="border border-gray-400 p-2">{item.concepto}</td>
                  <td className="border border-gray-400 p-2 text-right">{item.monto}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Informe Técnico del Proyecto</h2>
          {datos.informeTecnico.map((parrafo, index) => <p key={`${parrafo}-${index}`}>{parrafo}</p>)}

          {datos.notaValorizado && <p><b>{datos.notaValorizado}</b></p>}

          {incluirAdjuntos && adjuntos.length > 0 && (
            <section>
              <h2>Archivos adjuntos</h2>
              {grupos.map(([tipo, archivos]) => (
                <div key={tipo}>
                  <h3>{ETIQUETAS_ADJUNTOS[tipo] || tipo}</h3>
                  <ul>
                    {archivos.map(archivo => <li key={archivo.id}>{archivo.nombre}</li>)}
                  </ul>
                </div>
              ))}
              {adjuntos.filter(archivo => archivo.mime_type?.startsWith('image/')).map(archivo => (
                <div key={`imagen-${archivo.id}`} style={{ breakBefore: 'page', pageBreakBefore: 'always' }}>
                  <h3>{archivo.nombre}</h3>
                  {urlsImagenes[archivo.id] && (
                    <img src={urlsImagenes[archivo.id]} alt={archivo.nombre}
                      style={{ maxWidth: '100%', maxHeight: '230mm' }} />
                  )}
                </div>
              ))}
            </section>
          )}
        </article>
      </div>
    </div>,
    document.body,
  )
}
