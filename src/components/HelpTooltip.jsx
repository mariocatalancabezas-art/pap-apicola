import React, { useState, useEffect } from 'react'
import { HelpCircle, X } from 'lucide-react'
import { FIELD_DESCRIPTIONS } from '../lib/fieldDescriptions'

export default function HelpTooltip({ fieldNum, align = 'right' }) {
  const [open, setOpen] = useState(false)
  const desc = FIELD_DESCRIPTIONS[fieldNum]

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    document.addEventListener('keydown', e => e.key === 'Escape' && close())
    return () => document.removeEventListener('keydown', close)
  }, [open])

  if (!desc) return null

  const posClass = align === 'left'
    ? 'absolute right-5 top-0 z-[9999]'
    : 'absolute left-5 top-0 z-[9999]'

  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className="text-honey-400 hover:text-honey-600 focus:outline-none"
        aria-label={`Ayuda campo ${fieldNum}`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-[9998] bg-transparent cursor-default"
            onClick={() => setOpen(false)}
            onTouchStart={() => setOpen(false)}
          />
          <div className={`${posClass} w-64 bg-gray-800 text-white text-xs rounded-lg p-3 shadow-xl leading-relaxed whitespace-pre-line`}>
            <div className="flex justify-between items-start gap-2">
              <span className="font-semibold text-honey-300 mb-1 block">Campo #{fieldNum}</span>
              <button type="button" onClick={() => setOpen(false)}>
                <X className="w-3 h-3 text-gray-400 hover:text-white" />
              </button>
            </div>
            {desc}
          </div>
        </>
      )}
    </span>
  )
}
