import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Briefcase, ChevronLeft, Loader2, List, User } from 'lucide-react'
import { listProyectos, formatPesos, parseMonto } from '../lib/proyectosInversion'
import { useAuth } from '../lib/AuthContext'

export default function ResumenProyectosInversion() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin'
  const puedeVer = isAdmin || !!user?.puede_ver_proyectos_inversion

  const [proyectos, setProyectos] = useState([])
  const [vista, setVista] = useState('listado')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!puedeVer) return
    let active = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await listProyectos()
        if (active) setProyectos(data)
      } catch (e) {
        if (active) setError(e.message)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [puedeVer])

  const proyectosOrdenados = useMemo(() => (
    [...proyectos].sort((a, b) => (
      (a.apicultor_nombre || '').localeCompare(b.apicultor_nombre || '', 'es-CL')
    ))
  ), [proyectos])

  const montos = useMemo(() => proyectos.reduce((totales, proyecto) => ({
    indap: totales.indap + parseMonto(proyecto.monto_indap),
    propio: totales.propio + parseMonto(proyecto.monto_propio),
    valorizado: totales.valorizado + parseMonto(proyecto.monto_valorizado),
    credito: totales.credito + parseMonto(proyecto.monto_credito),
    total: totales.total + parseMonto(proyecto.monto_total),
  }), { indap: 0, propio: 0, valorizado: 0, credito: 0, total: 0 }), [proyectos])

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
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => navigate('/proyectos-inversion')}
          className="p-1 rounded-lg hover:bg-gray-100" title="Volver">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-amber-500" /> Resumen de proyectos de inversión
        </h2>
      </div>

      {error && <div className="card bg-red-50 border-red-200 text-red-700 text-sm">{error}</div>}

      <div className="card flex gap-2 p-2">
        <button type="button" onClick={() => setVista('listado')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            vista === 'listado' ? 'bg-amber-100 text-amber-800' : 'text-gray-600 hover:bg-gray-100'
          }`}>
          <List className="w-4 h-4" /> Listado de Proyectos
        </button>
        <button type="button" onClick={() => setVista('montos')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            vista === 'montos' ? 'bg-amber-100 text-amber-800' : 'text-gray-600 hover:bg-gray-100'
          }`}>
          <BarChart3 className="w-4 h-4" /> Resumen montos
        </button>
      </div>

      {loading ? (
        <div className="card flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando proyectos…
        </div>
      ) : vista === 'listado' ? (
        proyectosOrdenados.length === 0 ? (
          <div className="card text-sm text-gray-500">
            Aún no hay proyectos de inversión registrados.
          </div>
        ) : (
          <div className="space-y-2">
            {proyectosOrdenados.map(proyecto => (
              <button key={proyecto.id} type="button"
                onClick={() => navigate(`/proyectos-inversion/${proyecto.id}`)}
                className="card w-full text-left hover:bg-amber-50 transition-colors">
                <p className="font-semibold text-sm text-gray-800 truncate">{proyecto.apicultor_nombre || 'Sin nombre'}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <User className="w-3 h-3" />
                  {proyecto.apicultor_rut || 'Sin RUT'}
                </p>
                <p className="text-sm text-gray-700 mt-1 truncate">
                  {proyecto.nombre_proyecto} · {proyecto.anio || 2026}
                </p>
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-3">
          <div className="card space-y-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-gray-600">Aporte Indap</span>
              <strong className="text-gray-800">{formatPesos(montos.indap)}</strong>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-gray-600">Aporte propio usuario</span>
              <strong className="text-gray-800">{formatPesos(montos.propio)}</strong>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-gray-600">Aporte valorizado</span>
              <strong className="text-gray-800">{formatPesos(montos.valorizado)}</strong>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-gray-600">Crédito Indap</span>
              <strong className="text-gray-800">{formatPesos(montos.credito)}</strong>
            </div>
            <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-3">
              <span className="font-semibold text-gray-700">Total general</span>
              <strong className="text-lg text-amber-700">{formatPesos(montos.total)}</strong>
            </div>
          </div>
          <div className="card text-sm text-gray-600">
            Cantidad de proyectos: <strong className="text-gray-800">{proyectos.length}</strong>
          </div>
        </div>
      )}
    </div>
  )
}
