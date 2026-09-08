import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Briefcase, ChevronLeft, Loader2, Pencil, Plus, Search, Trash2, User, X } from 'lucide-react'
import { ANIOS_PROYECTO, eliminarProyecto, formatPesos, listProyectos } from '../lib/proyectosInversion'
import { useAuth } from '../lib/AuthContext'

export default function ProyectosInversionAnio() {
  const navigate = useNavigate()
  const { anio: anioParam } = useParams()
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin'
  const puedeVer = isAdmin || !!user?.puede_ver_proyectos_inversion
  const puedeEditar = isAdmin || !!user?.puede_editar_proyectos_inversion
  const puedeEliminar = isAdmin || !!user?.puede_eliminar_proyectos_inversion
  const anio = Number(anioParam)
  const anioValido = ANIOS_PROYECTO.includes(anio)

  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const normalizar = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean)
  const proyectosFiltrados = palabras.length === 0
    ? proyectos
    : proyectos.filter(p => {
        const texto = normalizar(`${p.nombre_proyecto} ${p.apicultor_nombre} ${p.apicultor_rut} ${p.detalle_proyecto}`)
        return palabras.every(w => texto.includes(w))
      })

  async function load() {
    setLoading(true)
    setError('')
    try {
      setProyectos(await listProyectos(anio))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (puedeVer && anioValido) load()
  }, [puedeVer, anioValido, anio])

  async function borrar(proyecto) {
    if (!confirm(`¿Eliminar el proyecto "${proyecto.nombre_proyecto}" y sus archivos adjuntos?`)) return
    setError('')
    try {
      await eliminarProyecto(proyecto.id)
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

  if (!anioValido) {
    return (
      <div className="p-4 space-y-4">
        <button type="button" onClick={() => navigate('/proyectos-inversion')}
          className="p-1 rounded-lg hover:bg-gray-100" title="Volver">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="card bg-red-50 border-red-200 text-red-700 text-sm">
          El año de proyectos de inversión no es válido.
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button type="button" onClick={() => navigate('/proyectos-inversion')}
            className="p-1 rounded-lg hover:bg-gray-100" title="Volver">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-amber-500" /> Proyectos de Inversión año {anio}
          </h2>
        </div>
        {puedeEditar && (
          <button type="button" onClick={() => navigate(`/proyectos-inversion/nuevo?anio=${anio}`)}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
            <Plus className="w-4 h-4" /> Nuevo proyecto de inversión
          </button>
        )}
      </div>

      <button type="button" onClick={() => navigate(`/proyectos-inversion/anio/${anio}/resumen`)}
        className="w-full card text-left text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-colors">
        Resumen Proyectos de Inversión año {anio}
      </button>

      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar proyecto por nombre, apicultor, RUT o palabra…"
          className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
        {busqueda && (
          <button type="button" onClick={() => setBusqueda('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:bg-gray-100" title="Limpiar">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && <div className="card bg-red-50 border-red-200 text-red-700 text-sm">{error}</div>}

      {loading ? (
        <div className="card flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando proyectos…
        </div>
      ) : proyectos.length === 0 ? (
        <div className="card text-sm text-gray-500">
          Aún no hay proyectos de inversión registrados para el año {anio}.
        </div>
      ) : proyectosFiltrados.length === 0 ? (
        <div className="card text-sm text-gray-500">
          Ningún proyecto coincide con “{busqueda}”.
        </div>
      ) : (
        <div className="space-y-2">
          {proyectosFiltrados.map(proyecto => (
            <div key={proyecto.id} className="card flex items-start justify-between gap-3">
              <button type="button" onClick={() => navigate(`/proyectos-inversion/${proyecto.id}`)}
                className="flex-1 text-left min-w-0">
                <p className="font-semibold text-sm text-gray-800 truncate">{proyecto.nombre_proyecto}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <User className="w-3 h-3" />
                  {proyecto.apicultor_nombre}{proyecto.apicultor_rut ? ` · ${proyecto.apicultor_rut}` : ''}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Total {formatPesos(proyecto.monto_total)} · Indap {formatPesos(proyecto.monto_indap)}
                  {proyecto.solicita_credito ? ` · Crédito ${formatPesos(proyecto.monto_credito)}` : ''}
                </p>
              </button>
              <div className="flex items-center gap-1">
                {puedeEditar && (
                  <button type="button" onClick={() => navigate(`/proyectos-inversion/${proyecto.id}`)}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" title="Editar">
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {puedeEliminar && (
                  <button type="button" onClick={() => borrar(proyecto)}
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
