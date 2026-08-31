import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, ClipboardList } from 'lucide-react'
import { ANIOS_PROYECTO } from '../lib/proyectosInversion'
import { useAuth } from '../lib/AuthContext'

export default function ProyectosInversion() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin'
  const puedeVer = isAdmin || !!user?.puede_ver_proyectos_inversion

  if (!puedeVer) {
    return (
      <div className="p-4">
        <div className="card bg-red-50 border-red-200 text-red-700 text-sm">
          No tienes permisos para ver los proyectos de inversión. Solicita el acceso al administrador.
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-amber-500" /> Proyectos de Inversión
        </h2>
      </div>

      <div className="space-y-3">
        {ANIOS_PROYECTO.map(anio => (
          <button key={anio} type="button" onClick={() => navigate(`/proyectos-inversion/anio/${anio}`)}
            className="card w-full flex items-center gap-3 text-left hover:bg-amber-50 transition-colors">
            <ClipboardList className="w-6 h-6 text-amber-500 flex-shrink-0" />
            <span className="font-semibold text-gray-700">Proyectos de Inversión año {anio}</span>
          </button>
        ))}
      </div>

      <button type="button" onClick={() => navigate('/proyectos-inversion/resumen')}
        className="w-full card text-left text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-colors">
        Resumen general Proyectos de Inversión
      </button>
    </div>
  )
}
