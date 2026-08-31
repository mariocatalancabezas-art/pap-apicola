import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Plus, Loader2, Pencil, Trash2, User } from 'lucide-react'
import { listProyectos, eliminarProyecto, formatPesos } from '../lib/proyectosInversion'
import { useAuth } from '../lib/AuthContext'

export default function ProyectosInversion() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin'
  const puedeVer = isAdmin || !!user?.puede_ver_proyectos_inversion
  const puedeEditar = isAdmin || !!user?.puede_editar_proyectos_inversion
  const puedeEliminar = isAdmin || !!user?.puede_eliminar_proyectos_inversion

  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      setProyectos(await listProyectos())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (puedeVer) load() }, [puedeVer])

  async function borrar(p) {
    if (!confirm(`¿Eliminar el proyecto "${p.nombre_proyecto}" y sus archivos adjuntos?`)) return
    setError('')
    try {
      await eliminarProyecto(p.id)
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

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
        {puedeEditar && (
          <button type="button" onClick={() => navigate('/proyectos-inversion/nuevo')}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
            <Plus className="w-4 h-4" /> Nuevo proyecto de inversión
          </button>
        )}
      </div>

      <button type="button" onClick={() => navigate('/proyectos-inversion/resumen')}
        className="w-full card text-left text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-colors">
        Resumen de proyectos de inversión
      </button>

      {error && <div className="card bg-red-50 border-red-200 text-red-700 text-sm">{error}</div>}

      {loading ? (
        <div className="card flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando proyectos…
        </div>
      ) : proyectos.length === 0 ? (
        <div className="card text-sm text-gray-500">
          Aún no hay proyectos de inversión registrados.
        </div>
      ) : (
        <div className="space-y-2">
          {proyectos.map(p => (
            <div key={p.id} className="card flex items-start justify-between gap-3">
              <button type="button" onClick={() => navigate(`/proyectos-inversion/${p.id}`)}
                className="flex-1 text-left min-w-0">
                <p className="font-semibold text-sm text-gray-800 truncate">{p.nombre_proyecto}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <User className="w-3 h-3" />
                  {p.apicultor_nombre}{p.apicultor_rut ? ` · ${p.apicultor_rut}` : ''}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Total {formatPesos(p.monto_total)} · Indap {formatPesos(p.monto_indap)}
                  {p.solicita_credito ? ` · Crédito ${formatPesos(p.monto_credito)}` : ''}
                </p>
              </button>
              <div className="flex items-center gap-1">
                {puedeEditar && (
                  <button type="button" onClick={() => navigate(`/proyectos-inversion/${p.id}`)}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" title="Editar">
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {puedeEliminar && (
                  <button type="button" onClick={() => borrar(p)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
