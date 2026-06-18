import React, { useState, useRef, useEffect } from 'react'
import { X, Mic, MicOff, Save, GitFork } from 'lucide-react'
import { TIPOS_PC } from '../lib/fieldDescriptions'

const FIELDS = [1,2,3,4,5]
const PC_MAP = [
  { desc: 'f79_pc1', tipo: 'f84_tipo_pc1', sol: 'f89_solucion_pc1', inv: 'f94_inversion_pc1' },
  { desc: 'f80_pc2', tipo: 'f85_tipo_pc2', sol: 'f90_solucion_pc2', inv: 'f95_inversion_pc2' },
  { desc: 'f81_pc3', tipo: 'f86_tipo_pc3', sol: 'f91_solucion_pc3', inv: 'f96_inversion_pc3' },
  { desc: 'f82_pc4', tipo: 'f87_tipo_pc4', sol: 'f92_solucion_pc4', inv: 'f97_inversion_pc4' },
  { desc: 'f83_pc5', tipo: 'f88_tipo_pc5', sol: 'f93_solucion_pc5', inv: 'f98_inversion_pc5' },
]

export default function BreachasModal({ form, onChange, onClose, onSave }) {
  const [listening, setListening] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [targetField, setTargetField] = useState(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    FIELDS.forEach(i => {
      const src = PC_MAP[i - 1]
      const descVal = form[src.desc] || ''
      if (descVal && descVal !== '__otra__') {
        onChange({ target: { name: `brechas_pc${i}`,        value: descVal } })
        onChange({ target: { name: `brechas_tipo_pc${i}`,   value: form[src.tipo] || '' } })
        onChange({ target: { name: `brechas_solucion_pc${i}`, value: form[src.sol] || '' } })
        onChange({ target: { name: `brechas_inversion_pc${i}`, value: form[src.inv] || '' } })
      }
    })
  }, [])

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

  function startVoice(fieldName) {
    if (!SpeechRecognition) return alert('Tu dispositivo no soporta reconocimiento de voz. Intenta desde Chrome en Android.')
    if (recognitionRef.current) recognitionRef.current.stop()

    const rec = new SpeechRecognition()
    rec.lang = 'es-ES'
    rec.continuous = false
    rec.interimResults = true

    setTargetField(fieldName)
    setListening(fieldName)
    setTranscript('')

    rec.onresult = (e) => {
      let interim = ''
      let final = ''
      for (let r of e.results) {
        if (r.isFinal) final += r[0].transcript
        else interim += r[0].transcript
      }
      setTranscript(final || interim)
      if (final) {
        const existing = form[fieldName] ? form[fieldName] + ' ' : ''
        onChange({ target: { name: fieldName, value: existing + final.trim() } })
        setListening(null)
        setTargetField(null)
        setTranscript('')
      }
    }
    rec.onerror = () => { setListening(null); setTargetField(null) }
    rec.onend = () => { setListening(null) }

    recognitionRef.current = rec
    rec.start()
  }

  function stopVoice() {
    if (recognitionRef.current) recognitionRef.current.stop()
    setListening(null)
    setTargetField(null)
  }

  useEffect(() => () => { if (recognitionRef.current) recognitionRef.current.stop() }, [])

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="bg-white w-full max-w-lg rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-purple-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <GitFork className="w-5 h-5 text-purple-600" />
            <h2 className="font-bold text-gray-800">Brechas del negocio</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          <p className="text-xs text-gray-500 bg-purple-50 rounded-lg p-3">
            Registra los principales puntos críticos para que el usuario sea proveedor estable de la empresa.
            Usa el <strong>micrófono</strong> en cada campo para dictar por voz — el texto se transcribirá automáticamente.
          </p>

          {/* Transcript live indicator */}
          {listening && transcript && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-sm text-purple-700 flex items-center gap-2">
              <Mic className="w-4 h-4 animate-pulse text-red-500 flex-shrink-0" />
              <span className="italic">{transcript}</span>
            </div>
          )}

          {FIELDS.map(i => {
            const pcKey = `brechas_pc${i}`
            const tipoKey = `brechas_tipo_pc${i}`
            const solKey = `brechas_solucion_pc${i}`
            const invKey = `brechas_inversion_pc${i}`
            const sincDesc = form[PC_MAP[i-1].desc] && form[PC_MAP[i-1].desc] !== '__otra__'
            return (
              <div key={i} className="border border-purple-100 rounded-xl p-3 space-y-2 bg-white shadow-sm">
                <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">
                  Punto Crítico {i}
                  {sincDesc && <span className="ml-2 text-green-600 font-normal normal-case">↔ sincronizado</span>}
                </p>

                {/* Descripción — solo lectura si viene de sección E */}
                <div>
                  <label className="label text-xs">Descripción</label>
                  {sincDesc ? (
                    <p className="input-field bg-gray-50 text-gray-700 cursor-default">{form[pcKey] || form[PC_MAP[i-1].desc]}</p>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        name={pcKey}
                        value={form[pcKey] || ''}
                        onChange={onChange}
                        className="input-field flex-1"
                        placeholder="Ej: Bajos rendimientos, Mala calidad…"
                      />
                      <button
                        type="button"
                        onClick={() => listening === pcKey ? stopVoice() : startVoice(pcKey)}
                        className={`flex-shrink-0 p-2 rounded-lg transition-colors ${listening === pcKey ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'}`}
                        title="Dictar por voz"
                      >
                        {listening === pcKey ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label text-xs">Tipo</label>
                    {sincDesc ? (
                      <p className="input-field bg-gray-50 text-gray-700 cursor-default">{form[tipoKey] || '—'}</p>
                    ) : (
                      <select name={tipoKey} value={form[tipoKey] || ''} onChange={onChange} className="input-field">
                        <option value="">—</option>
                        {TIPOS_PC.map(t => <option key={t}>{t}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="label text-xs">¿Requiere inversión?</label>
                    {sincDesc ? (
                      <p className="input-field bg-gray-50 text-gray-700 cursor-default">{form[invKey] || '—'}</p>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          name={invKey}
                          value={form[invKey] || ''}
                          onChange={onChange}
                          className="input-field flex-1"
                          placeholder="SI-Equipamiento / NO"
                        />
                        <button
                          type="button"
                          onClick={() => listening === invKey ? stopVoice() : startVoice(invKey)}
                          className={`flex-shrink-0 p-2 rounded-lg transition-colors ${listening === invKey ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                          {listening === invKey ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Solution with voice */}
                <div>
                  <label className="label text-xs">Propuesta de solución</label>
                  {sincDesc ? (
                    <p className="input-field bg-gray-50 text-gray-700 cursor-default">{form[solKey] || '—'}</p>
                  ) : (
                  <div className="flex gap-2">
                    <textarea
                      name={solKey}
                      value={form[solKey] || ''}
                      onChange={onChange}
                      rows={2}
                      className="input-field flex-1 resize-none"
                      placeholder="Asesoría técnica, inversión en equipamiento…"
                    />
                    <button
                      type="button"
                      onClick={() => listening === solKey ? stopVoice() : startVoice(solKey)}
                      className={`flex-shrink-0 p-2 rounded-lg self-start transition-colors ${listening === solKey ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'}`}
                      title="Dictar por voz"
                    >
                      {listening === solKey ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Nota final */}
          <div className="border border-gray-100 rounded-xl p-3 space-y-2">
            <label className="label text-xs">Nota adicional</label>
            <div className="flex gap-2">
              <textarea
                name="brechas_nota"
                value={form.brechas_nota || ''}
                onChange={onChange}
                rows={3}
                className="input-field flex-1 resize-none"
                placeholder="En caso que el usuario requiera inversión, deberá estar contemplado en el Plan de Inversión."
              />
              <button
                type="button"
                onClick={() => listening === 'brechas_nota' ? stopVoice() : startVoice('brechas_nota')}
                className={`flex-shrink-0 p-2 rounded-lg self-start transition-colors ${listening === 'brechas_nota' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {listening === 'brechas_nota' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-2">
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              className="flex-1 flex items-center justify-center gap-2 bg-purple-100 text-purple-700 hover:bg-purple-200 font-semibold py-3 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              Guardar
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 btn-primary flex items-center justify-center gap-2 py-3"
          >
            <Save className="w-4 h-4" />
            Guardar y cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
