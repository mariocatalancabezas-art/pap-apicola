import React, { useEffect, useState } from 'react'
import { UserCheck, UserX, Shield, User, RefreshCw } from 'lucide-react'
import { getUsuarios, updateUsuario } from '../lib/auth'
import { useAuth } from '../lib/AuthContext'

const ROL_LABEL = { admin: 'Administrador', user: 'Usuario', pendiente: 'Pendiente' }
const ROL_COLOR = {
  admin:     'bg-purple-100 text-purple-700',
  user:      'bg-blue-100 text-blue-700',
  pendiente: 'bg-amber-100 text-amber-700',
}

const PERMISOS = [
  { key: 'puede_crear',    label: 'Crear diagnósticos' },
  { key: 'puede_editar',   label: 'Editar diagnósticos' },
  { key: 'puede_eliminar', label: 'Eliminar diagnósticos' },
  { key: 'puede_exportar', label: 'Exportar / Imprimir' },
  { key: 'puede_editar_apicultores', label: 'Editar planilla apicultores' },
  { key: 'puede_ver_acciones', label: 'Ver columna acciones (apicultores)' },
  { key: 'puede_ver_password_apicultores', label: 'Ver Password Apicultores' },
  { key: 'puede_editar_password_apicultores', label: 'Editar Password Apicultores' },
  { key: 'puede_ver_observaciones_apicultores', label: 'Ver Observaciones Apicultores' },
  { key: 'puede_editar_observaciones_apicultores', label: 'Editar Observaciones Apicultores' },
  { key: 'puede_ver_observaciones_secretaria', label: 'Ver Observaciones Secretaría' },
  { key: 'puede_editar_observaciones_secretaria', label: 'Editar Observaciones Secretaría' },
  { key: 'puede_ver_observaciones_tecnico_administrativa', label: 'Ver Observaciones Técnico Administrativa' },
  { key: 'puede_editar_observaciones_tecnico_administrativa', label: 'Editar Observaciones Técnico Administrativa' },
]

export default function Usuarios() {
  const { user } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [msg, setMsg] = useState('')

  async function cargar() {
    setLoading(true)
    try { setUsuarios(await getUsuarios()) }
    catch (err) { setMsg('✗ Error al cargar: ' + err.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  async function accion(id, changes, texto) {
    setSaving(id)
    try {
      await updateUsuario(id, changes)
      setMsg('✓ ' + texto)
      cargar()
    } catch (err) {
      setMsg('✗ Error: ' + err.message)
    } finally {
      setSaving(null)
    }
  }

  async function togglePermiso(u, key) {
    const nuevoValor = !u[key]
    setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, [key]: nuevoValor } : x))
    try {
      await updateUsuario(u.id, { [key]: nuevoValor })
      setMsg(`✓ Permiso actualizado para ${u.nombre}`)
    } catch (err) {
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, [key]: !nuevoValor } : x))
      setMsg('✗ Error: ' + err.message)
    }
  }

  if (user?.rol !== 'admin') {
    return (
      <div className="p-4">
        <div className="card bg-red-50 border-red-200 text-red-700 text-sm">No tienes permisos para ver esta página.</div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Gestión de usuarios</h2>
        <button onClick={cargar} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {msg && (
        <div className={`card text-sm font-medium ${msg.startsWith('✓') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {msg}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 text-center py-8">Cargando…</p>
      ) : (
        <div className="space-y-4">
          {usuarios.map(u => {
            const esMiCuenta = u.id === user.id
            const esPendiente = u.rol === 'pendiente'
            return (
              <div key={u.id} className={`card space-y-3 ${esPendiente ? 'border-amber-200 bg-amber-50' : ''}`}>

                {/* Cabecera */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-800">{u.nombre} {esMiCuenta && <span className="text-xs text-gray-400 font-normal">(tú)</span>}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Desde: {new Date(u.created_at).toLocaleDateString('es-CL')}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROL_COLOR[u.rol]}`}>{ROL_LABEL[u.rol]}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>

                {/* Acciones de cuenta */}
                {!esMiCuenta && (
                  <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-100">
                    {!u.activo && (
                      <button disabled={saving === u.id}
                        onClick={() => accion(u.id, { activo: true, rol: esPendiente ? 'user' : u.rol }, `${u.nombre} aprobado`)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-medium flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" /> Aprobar acceso
                      </button>
                    )}
                    {u.activo && (
                      <button disabled={saving === u.id}
                        onClick={() => accion(u.id, { activo: false }, `${u.nombre} bloqueado`)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium flex items-center gap-1">
                        <UserX className="w-3.5 h-3.5" /> Bloquear
                      </button>
                    )}
                    {u.rol !== 'admin' && u.activo && (
                      <button disabled={saving === u.id}
                        onClick={() => accion(u.id, { rol: 'admin' }, `${u.nombre} ahora es administrador`)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" /> Hacer administrador
                      </button>
                    )}
                    {u.rol === 'admin' && (
                      <button disabled={saving === u.id}
                        onClick={() => accion(u.id, { rol: 'user' }, `${u.nombre} es ahora usuario normal`)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> Quitar admin
                      </button>
                    )}
                  </div>
                )}

                {/* Permisos */}
                {!esMiCuenta && u.activo && u.rol !== 'admin' && (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Permisos</p>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                      {PERMISOS.map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!u[key]}
                            onChange={() => togglePermiso(u, key)}
                            className="rounded border-gray-300 text-amber-500 focus:ring-amber-300"
                          />
                          <span className="text-xs text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {u.rol === 'admin' && !esMiCuenta && (
                  <p className="text-xs text-purple-500 italic pt-1 border-t border-gray-100">Los administradores tienen todos los permisos.</p>
                )}

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
