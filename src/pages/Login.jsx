import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { login, register } from '../lib/auth'
import { useAuth } from '../lib/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login: setSession } = useAuth()

  const [modo, setModo] = useState('login') // 'login' | 'registro'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setMsg({ text: '', type: '' })
    try {
      const session = await login(email, password, remember)
      setSession(session)
      navigate('/', { replace: true })
    } catch (err) {
      setMsg({ text: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (!nombre.trim()) return setMsg({ text: 'El nombre es obligatorio', type: 'error' })
    setLoading(true)
    setMsg({ text: '', type: '' })
    try {
      await register(email, password, nombre)
      setMsg({ text: '✓ Registro enviado. Espera que el administrador apruebe tu cuenta.', type: 'ok' })
      setModo('login')
      setNombre('')
      setPassword('')
    } catch (err) {
      setMsg({ text: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-6xl">🐝</span>
          <h1 className="mt-3 text-2xl font-bold text-amber-900">PAP Apícola</h1>
          <p className="text-amber-700 text-sm">Santa Bárbara · INDAP</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-5">
          <div className="flex rounded-lg overflow-hidden border border-amber-200">
            <button
              onClick={() => { setModo('login'); setMsg({ text: '', type: '' }) }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${modo === 'login' ? 'bg-amber-400 text-white' : 'text-amber-700 hover:bg-amber-50'}`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => { setModo('registro'); setMsg({ text: '', type: '' }) }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${modo === 'registro' ? 'bg-amber-400 text-white' : 'text-amber-700 hover:bg-amber-50'}`}
            >
              Registrarse
            </button>
          </div>

          {msg.text && (
            <div className={`text-sm rounded-lg px-3 py-2 ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {msg.text}
            </div>
          )}

          <form onSubmit={modo === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {modo === 'registro' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Usuario / Correo</label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@correo.com"
                required
                autoComplete="username"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {modo === 'login' && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="rounded border-gray-300 text-amber-500 focus:ring-amber-300"
                />
                <span className="text-xs text-gray-600">Mantener sesión iniciada</span>
              </label>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3"
            >
              {modo === 'login'
                ? <><LogIn className="w-4 h-4" />{loading ? 'Ingresando…' : 'Ingresar'}</>
                : <><UserPlus className="w-4 h-4" />{loading ? 'Registrando…' : 'Solicitar acceso'}</>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
