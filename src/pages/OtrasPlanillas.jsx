import React from 'react'
import { FolderOpen } from 'lucide-react'

export default function OtrasPlanillas() {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-64 text-center space-y-3">
      <FolderOpen className="w-12 h-12 text-amber-300" />
      <h2 className="text-lg font-bold text-gray-700">Otras Planillas</h2>
      <p className="text-sm text-gray-400">Próximamente — funcionalidad en desarrollo</p>
    </div>
  )
}
