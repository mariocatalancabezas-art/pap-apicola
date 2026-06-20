import React from 'react'
import { X, Save, MessageCircleQuestion } from 'lucide-react'

const PREGUNTAS = [
  { key: 'asb_anios_apicultura', label: '¿Cuántos años lleva en la Apicultura?' },
  { key: 'asb_motivacion', label: '¿Qué lo motiva a seguir en la apicultura?' },
  { key: 'asb_talleres_interes', label: 'Talleres o capacitaciones de interés' },
]

export default function PreguntasASBModal({ form, onChange, onClose, onSave }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="bg-white w-full max-w-lg rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-amber-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <MessageCircleQuestion className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-gray-800">Preguntas ASB</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          <p className="text-xs text-gray-500 bg-amber-50 rounded-lg p-3">
            Estas preguntas quedan guardadas en la aplicación y no se incluyen en las exportaciones ni impresiones.
          </p>

          {PREGUNTAS.map(({ key, label }) => (
            <div key={key} className="border border-gray-100 rounded-xl p-3 space-y-2 bg-white shadow-sm">
              <label className="label text-xs font-medium text-gray-700">{label}</label>
              <textarea
                name={key}
                value={form[key] || ''}
                onChange={onChange}
                rows={3}
                className="input-field w-full resize-none"
                placeholder="Escribe la respuesta…"
              />
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-2">
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-100 text-amber-700 hover:bg-amber-200 font-semibold py-3 rounded-lg transition-colors"
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
