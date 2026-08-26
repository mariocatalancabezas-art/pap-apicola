import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Download, Send, Trash2, Upload } from 'lucide-react'
import CameraCapture from './CameraCapture'
import {
  addFotoVisita, descargarFotoVisita, deleteFotoVisita, listFotosVisita,
  obtenerArchivoFotoVisita,
} from '../lib/visitaFotos'

export default function FotosVisita({ visitaUuid, puedeEditar }) {
  const [fotos, setFotos] = useState([])
  const [showCamera, setShowCamera] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInput = useRef(null)
  const puedeEnviar = fotos.length > 0 && !!navigator.canShare && !!navigator.share

  async function cargarFotos() {
    if (!visitaUuid) {
      setFotos([])
      return
    }
    try {
      setFotos(await listFotosVisita(visitaUuid))
    } catch (loadError) {
      setError(loadError.message)
    }
  }

  useEffect(() => {
    cargarFotos()
  }, [visitaUuid])

  const previewUrls = useMemo(() => (
    Object.fromEntries(
      fotos
        .filter(foto => foto.blob)
        .map(foto => [foto.uuid, URL.createObjectURL(foto.blob)])
    )
  ), [fotos])

  useEffect(() => (
    () => Object.values(previewUrls).forEach(url => URL.revokeObjectURL(url))
  ), [previewUrls])

  async function agregarFoto(file) {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      await addFotoVisita(visitaUuid, file)
      await cargarFotos()
    } catch (addError) {
      setError(addError.message)
    } finally {
      setLoading(false)
    }
  }

  async function subirFotos(event) {
    const archivos = Array.from(event.target.files || [])
    event.target.value = ''
    for (const archivo of archivos.slice(0, Math.max(0, 5 - fotos.length))) {
      await agregarFoto(archivo)
    }
  }

  async function eliminarFoto(foto) {
    if (!confirm(`¿Eliminar la fotografía ${foto.nombre || 'seleccionada'}?`)) return
    try {
      setError('')
      await deleteFotoVisita(foto.uuid)
      await cargarFotos()
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  async function descargarTodas() {
    try {
      setError('')
      for (const foto of fotos) await descargarFotoVisita(foto)
    } catch (downloadError) {
      setError(downloadError.message)
    }
  }

  async function enviarFotos() {
    try {
      setError('')
      const files = await Promise.all(fotos.map(obtenerArchivoFotoVisita))
      if (!navigator.canShare?.({ files })) return
      await navigator.share({ files, title: 'Fotografías de la visita' })
    } catch (shareError) {
      if (shareError?.name !== 'AbortError') setError(shareError.message)
    }
  }

  const llena = fotos.length >= 5
  const deshabilitado = !visitaUuid || !puedeEditar || loading || llena

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-sm text-gray-700">Fotografías de la visita (máximo 5)</h3>
        {fotos.length > 0 && (
          <span className="text-xs text-gray-500">{fotos.length}/5 fotografías</span>
        )}
      </div>
      {!visitaUuid && (
        <p className="text-xs text-amber-600">Guarda la visita para poder adjuntar fotografías.</p>
      )}
      {llena && <p className="text-xs text-amber-600">Máximo 5 fotografías por visita</p>}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={subirFotos}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          disabled={deshabilitado}
          className="flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-200 disabled:opacity-50"
        >
          <Camera className="w-4 h-4" /> Tomar fotografía
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={deshabilitado}
          className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        >
          <Upload className="w-4 h-4" /> Subir fotografías
        </button>
        {fotos.length > 0 && (
          <button
            type="button"
            onClick={descargarTodas}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
          >
            <Download className="w-4 h-4" /> Descargar todas
          </button>
        )}
        {puedeEnviar && (
          <button
            type="button"
            onClick={enviarFotos}
            className="flex items-center gap-2 rounded-lg bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-200"
          >
            <Send className="w-4 h-4" /> Enviar
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {fotos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {fotos.map(foto => (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50" key={foto.uuid}>
              <div className="aspect-square bg-gray-100">
                {previewUrls[foto.uuid] || foto.preview_url ? (
                  <img
                    src={previewUrls[foto.uuid] || foto.preview_url}
                    alt={foto.nombre || 'Fotografía de la visita'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-gray-400">Sin vista previa</div>
                )}
              </div>
              <div className="flex items-center justify-end gap-1 p-1">
                <button
                  type="button"
                  title="Descargar fotografía"
                  onClick={() => descargarFotoVisita(foto).catch(downloadError => setError(downloadError.message))}
                  className="rounded p-1 text-gray-500 hover:bg-gray-200"
                >
                  <Download className="w-4 h-4" />
                </button>
                {puedeEditar && (
                  <button
                    type="button"
                    title="Eliminar fotografía"
                    onClick={() => eliminarFoto(foto)}
                    className="rounded p-1 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {showCamera && (
        <CameraCapture
          onCapture={file => {
            setShowCamera(false)
            agregarFoto(file)
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  )
}
