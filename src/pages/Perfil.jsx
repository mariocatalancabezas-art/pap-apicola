import React, { useState } from 'react'
import { Save, KeyRound, User } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { updateUsuario } from '../lib/auth'

const SALT = 'PAPApicola2024'

async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(SALT + password + SALT)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function Perfil() {
  const { user, login } = useAuth()

  const [nombre, setNombre] = useState(user?.nombre || '')
  const [claveActual, setClaveActual] = useState('')
  const [claveNueva, setClaveNueva] = useState('')
  const [claveConfirm, setClaveConfirm] = useState('')
  const [loadingNombre, setLoadingNombre] = useState(false)
  const [loadingClave, setLoadingClave] = useState(false)
  const [msgNombre, setMsgNombre] = useState('')
  const [msgClave, setMsgClave] = useState('')

  async function guardarNombre(e) {
    e.preventDefault()
    if (!nombre.trim()) return
    setLoadingNombre(true)
    setMsgNombre('')
    try {
      await updateUsuario(user.id, { nombre: nombre.trim() })
      const updated = { ...user, nombre: nombre.trim() }
      login(updated)
      const raw = localStorage.getItem('pap_session')
      if (raw) localStorage.setItem('pap_session', JSON.stringify(updated))
      else sessionStorage.setItem('pap_session', JSON.stringify(updated))
      setMsgNombre('✓ Nombre actualizado')
    } catch (err) {
      setMsgNombre('✗ Error: ' + err.message)
    } finally {
      setLoadingNombre(false)
    }
  }

  async function cambiarClave(e) {
    e.preventDefault()
    setMsgClave('')
    if (claveNueva.length < 6) return setMsgClave('✗ La nueva contraseña debe tener al menos 6 caracteres')
    if (claveNueva !== claveConfirm) return setMsgClave('✗ Las contraseñas no coinciden')
    setLoadingClave(true)
    try {
      const hashActual = await hashPassword(claveActual)
      const { supabase } = await import('../lib/supabase')
      const { data, error } = await supabase
        .from('app_users')
        .select('id')
        .eq('id', user.id)
        .eq('password_hash', hashActual)
        .single()
      if (error || !data) throw new Error('La contraseña actual es incorrecta')
      const hashNuevo = await hashPassword(claveNueva)
      await updateUsuario(user.id, { password_hash: hashNuevo })
      setMsgClave('✓ Contraseña actualizada correctamente')
      setClaveActual('')
      setClaveNueva('')
      setClaveConfirm('')
    } catch (err) {
      setMsgClave('✗ ' + err.message)
    } finally {
      setLoadingClave(false)
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-md">
      <h2 className="text-lg font-bold">Mi perfil</h2>

      {/* Datos personales */}
      <form onSubmit={guardarNombre} className="card space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-sm">Datos personales</h3>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Correo</label>
          <input
            type="text"
            value={user?.email || ''}
            disabled
            className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
          <input
            type="text"
            value={user?.rol === 'admin' ? 'Administrador' : 'Usuario'}
            disabled
            className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400"
          />
        </div>
        {msgNombre && (
          <p className={`text-xs font-medium ${msgNombre.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{msgNombre}</p>
        )}
        <button type="submit" disabled={loadingNombre} className="btn-primary flex items-center gap-2 text-sm py-2">
          <Save className="w-4 h-4" />{loadingNombre ? 'Guardando…' : 'Guardar nombre'}
        </button>
      </form>

      {/* Cambio de contraseña */}
      <form onSubmit={cambiarClave} className="card space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-sm">Cambiar contraseña</h3>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña actual</label>
          <input
            type="password"
            value={claveActual}
            onChange={e => setClaveActual(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nueva contraseña</label>
          <input
            type="password"
            value={claveNueva}
            onChange={e => setClaveNueva(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Confirmar nueva contraseña</label>
          <input
            type="password"
            value={claveConfirm}
            onChange={e => setClaveConfirm(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
        {msgClave && (
          <p className={`text-xs font-medium ${msgClave.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{msgClave}</p>
        )}
        <button type="submit" disabled={loadingClave} className="btn-primary flex items-center gap-2 text-sm py-2">
          <KeyRound className="w-4 h-4" />{loadingClave ? 'Actualizando…' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  )
}
