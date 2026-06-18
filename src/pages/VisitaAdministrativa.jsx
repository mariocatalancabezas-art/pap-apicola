import React from 'react'
import { FileText } from 'lucide-react'

export default function VisitaAdministrativa() {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-64 text-center space-y-3">
      <FileText className="w-12 h-12 text-amber-300" />
      <h2 className="text-lg font-bold text-gray-700">Nueva Visita Administrativa</h2>
      <p className="text-sm text-gray-400">Próximamente — funcionalidad en desarrollo</p>
    </div>
  )
}
