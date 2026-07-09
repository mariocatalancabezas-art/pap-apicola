import React from 'react'
import { X, Save, MessageCircleQuestion } from 'lucide-react'

const PREGUNTAS = [
  { key: 'asb_anios_apicultura', label: '¿Cuántos años lleva en la Apicultura?' },
  { key: 'asb_motivacion', label: '¿Qué lo motiva a seguir en la apicultura?' },
  { key: 'asb_talleres_interes', label: 'Talleres o capacitaciones de interés' },
]

function SiNo({ name, value, onChange }) {
  function set(val) {
    // Permite deseleccionar volviendo a tocar la misma opción.
    onChange({ target: { name, value: value === val ? '' : val } })
  }
  const base = 'flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors'
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => set('si')}
        className={`${base} ${value === 'si'
          ? 'bg-green-600 text-white border-green-600'
          : 'bg-white text-gray-600 border-gray-200 hover:bg-green-50'}`}
      >
        Sí
      </button>
      <button
        type="button"
        onClick={() => set('no')}
        className={`${base} ${value === 'no'
          ? 'bg-red-600 text-white border-red-600'
          : 'bg-white text-gray-600 border-gray-200 hover:bg-red-50'}`}
      >
        No
      </button>
    </div>
  )
}

export default function PreguntasASBModal({ form, onChange, onClose, onSave }) {
  const salaAutorizada = form.asb_sala_autorizada || ''
  const salaPronta = form.asb_sala_pronta_autorizar || ''

  function onSalaAutorizada(e) {
    onChange({ target: { name: 'asb_sala_autorizada', value: e.target.value } })
    if (e.target.value !== 'no') {
      onChange({ target: { name: 'asb_sala_pronta_autorizar', value: '' } })
      onChange({ target: { name: 'asb_que_le_falta', value: '' } })
    }
  }
  function onSalaPronta(e) {
    onChange({ target: { name: 'asb_sala_pronta_autorizar', value: e.target.value } })
    if (e.target.value !== 'si') {
      onChange({ target: { name: 'asb_que_le_falta', value: '' } })
    }
  }

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
            Estas preguntas se guardan junto al diagnóstico y se sincronizan; no se incluyen en las exportaciones ni impresiones.
          </p>

          {/* ¿Nos entregó miel? */}
          <div className="border border-gray-100 rounded-xl p-3 space-y-2 bg-white shadow-sm">
            <label className="label text-xs font-medium text-gray-700">¿Nos entregó miel?</label>
            <SiNo name="asb_nos_entrego_miel" value={form.asb_nos_entrego_miel || ''} onChange={onChange} />
          </div>

          {/* ¿Sala autorizada? -> ¿Sala pronta a autorizar? -> Qué le falta */}
          <div className="border border-gray-100 rounded-xl p-3 space-y-3 bg-white shadow-sm">
            <div className="space-y-2">
              <label className="label text-xs font-medium text-gray-700">¿Sala autorizada?</label>
              <SiNo name="asb_sala_autorizada" value={salaAutorizada} onChange={onSalaAutorizada} />
            </div>

            {salaAutorizada === 'no' && (
              <div className="space-y-2 pl-3 border-l-2 border-amber-200">
                <label className="label text-xs font-medium text-gray-700">¿Sala pronta a autorizar?</label>
                <SiNo name="asb_sala_pronta_autorizar" value={salaPronta} onChange={onSalaPronta} />
              </div>
            )}

            {salaAutorizada === 'no' && salaPronta === 'si' && (
              <div className="space-y-2 pl-3 border-l-2 border-amber-200">
                <label className="label text-xs font-medium text-gray-700">Qué le falta:</label>
                <textarea
                  name="asb_que_le_falta"
                  value={form.asb_que_le_falta || ''}
                  onChange={onChange}
                  rows={3}
                  className="input-field w-full resize-none"
                  placeholder="Describe qué le falta para autorizar la sala…"
                />
              </div>
            )}
          </div>

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
