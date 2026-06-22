import React from 'react'
import { FolderOpen, Users, ClipboardList, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const PLANILLAS = [
  { to: '/planilla-asistencia-actividades', icon: Users, label: 'Asistencia Actividades Apicultores', color: 'text-honey-600' },
  { to: '/planilla-asistencia-general-visitas', icon: ClipboardList, label: 'Asistencia General Visitas', color: 'text-blue-600' },
  { to: '/planilla-asistencia-reuniones-equipo', icon: UsersRound, label: 'Asistencia a Reuniones de Equipo', color: 'text-purple-600' },
]

export default function OtrasPlanillas() {
  const navigate = useNavigate()
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <FolderOpen className="w-5 h-5 text-amber-600" />
        <h2 className="text-lg font-bold">Otras Planillas</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PLANILLAS.map(p => {
          const Icon = p.icon
          return (
            <button
              key={p.to}
              onClick={() => navigate(p.to)}
              className="card p-4 flex flex-col items-center text-center gap-3 hover:bg-amber-50 transition-colors"
            >
              <Icon className={`w-10 h-10 ${p.color}`} />
              <span className="text-sm font-semibold text-gray-800">{p.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
