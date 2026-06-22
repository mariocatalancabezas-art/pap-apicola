import React, { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'

function isSpeechSupported() {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
}

export default function VoiceInput({ value, onChange, disabled = false, placeholder = 'Escribe o dicta…' }) {
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)

  useEffect(() => {
    if (!isSpeechSupported()) return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'es-ES'

    recognition.onstart = () => {
      setIsListening(true)
      setError('')
    }

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return
      setError('Error de micrófono: ' + event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onresult = (event) => {
      let finalTranscript = value || ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript = finalTranscript ? finalTranscript + ' ' + transcript : transcript
        }
      }
      onChange(finalTranscript)
    }

    recognitionRef.current = recognition
  }, [value, onChange])

  function toggleListening() {
    if (!isSpeechSupported()) {
      setError('Tu navegador no soporta dictado por voz.')
      return
    }
    const recognition = recognitionRef.current
    if (!recognition) return
    if (isListening) {
      try { recognition.stop() } catch {}
    } else {
      try {
        recognition.start()
      } catch (err) {
        setError('No se pudo iniciar el micrófono.')
      }
    }
  }

  return (
    <div className="relative">
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        rows={3}
        className="input-field w-full pr-10 text-sm resize-y"
      />
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        className={`absolute right-2 top-2 p-1.5 rounded-lg transition-colors ${
          isListening
            ? 'bg-red-100 text-red-600 animate-pulse'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
        title={isListening ? 'Detener dictado' : 'Dictar con micrófono'}
      >
        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>
      {isListening && (
        <div className="absolute right-2 bottom-2 flex items-center gap-1 text-[10px] text-gray-400">
          <Loader2 className="w-3 h-3 animate-spin" /> Escuchando…
        </div>
      )}
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  )
}
