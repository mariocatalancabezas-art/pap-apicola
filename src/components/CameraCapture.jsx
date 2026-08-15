import React, { useEffect, useRef, useState } from 'react'
import { Camera, X, RotateCcw, Check, Loader2 } from 'lucide-react'

// Captura fotografías en la máxima resolución que entregue la cámara del dispositivo.
export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(true)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 4096 },
            height: { ideal: 2160 },
          },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
      } catch (e) {
        setError('No se pudo acceder a la cámara: ' + (e?.message || e))
      } finally {
        if (!cancelled) setStarting(false)
      }
    })()
    return () => {
      cancelled = true
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [])

  function tomarFoto() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(blob => {
      if (!blob) return
      const nombre = `foto_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`
      const file = new File([blob], nombre, { type: 'image/jpeg' })
      setPreview({ file, url: URL.createObjectURL(blob) })
    }, 'image/jpeg', 0.95)
  }

  function descartar() {
    if (preview) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }

  function confirmar() {
    if (!preview) return
    onCapture(preview.file)
    URL.revokeObjectURL(preview.url)
    setPreview(null)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Camera className="w-4 h-4 text-amber-500" /> Tomar fotografía
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-black relative aspect-[4/3] flex items-center justify-center">
          {starting && !error && (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          )}
          {error && <p className="text-white text-sm p-4 text-center">{error}</p>}
          {preview ? (
            <img src={preview.url} alt="Fotografía" className="w-full h-full object-contain" />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-contain ${error ? 'hidden' : ''}`}
            />
          )}
        </div>

        <div className="flex gap-2 p-3">
          {preview ? (
            <>
              <button type="button" onClick={descartar}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold py-2.5 rounded-lg">
                <RotateCcw className="w-4 h-4" /> Repetir
              </button>
              <button type="button" onClick={confirmar}
                className="flex-1 btn-primary flex items-center justify-center gap-2 py-2.5">
                <Check className="w-4 h-4" /> Usar fotografía
              </button>
            </>
          ) : (
            <button type="button" onClick={tomarFoto} disabled={!!error || starting}
              className="flex-1 btn-primary flex items-center justify-center gap-2 py-2.5 disabled:opacity-50">
              <Camera className="w-4 h-4" /> Capturar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
