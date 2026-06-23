import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, UserPlus, HelpCircle, X, Mail, ArrowLeft } from 'lucide-react'
import { login, register, solicitarRecuperacionPassword, resetearPasswordConCodigo } from '../lib/auth'
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
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetStep, setResetStep] = useState('solicitar') // 'solicitar' | 'codigo' | 'nuevo'
  const [resetEmail, setResetEmail] = useState('')
  const [resetCodigo, setResetCodigo] = useState('')
  const [resetNuevoPassword, setResetNuevoPassword] = useState('')
  const [resetMsg, setResetMsg] = useState({ text: '', type: '' })

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

  async function handleSolicitarCodigo() {
    if (!resetEmail.trim()) return
    setLoading(true)
    setResetMsg({ text: '', type: '' })
    try {
      const resultado = await solicitarRecuperacionPassword(resetEmail)
      setResetMsg({ text: resultado.mensaje, type: 'ok' })
      setResetStep('codigo')
    } catch (err) {
      setResetMsg({ text: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleVerificarCodigo() {
    if (!resetCodigo.trim()) return
    setLoading(true)
    setResetMsg({ text: '', type: '' })
    try {
      setResetStep('nuevo')
    } catch (err) {
      setResetMsg({ text: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword() {
    if (!resetNuevoPassword.trim()) return
    setLoading(true)
    setResetMsg({ text: '', type: '' })
    try {
      await resetearPasswordConCodigo(resetEmail, resetCodigo, resetNuevoPassword)
      setResetMsg({ text: '✓ Contraseña actualizada correctamente. Ya puedes iniciar sesión.', type: 'ok' })
      setTimeout(() => {
        setShowResetModal(false)
        setResetStep('solicitar')
        setResetEmail('')
        setResetCodigo('')
        setResetNuevoPassword('')
        setResetMsg({ text: '', type: '' })
      }, 2000)
    } catch (err) {
      setResetMsg({ text: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  function closeResetModal() {
    setShowResetModal(false)
    setResetStep('solicitar')
    setResetEmail('')
    setResetCodigo('')
    setResetNuevoPassword('')
    setResetMsg({ text: '', type: '' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold text-amber-800 tracking-wide uppercase mb-4">
            Programa Alianzas Productivas
          </h1>
          <div className="flex items-center justify-center gap-4 mb-3">
            <img
              src="/Logo/LOGO%20ASB.png.png"
              alt="PAP Apícola Santa Bárbara"
              className="w-24 h-24 object-contain drop-shadow-lg"
            />
            <img
              src="/Logo/LOGO%20INDAP.png"
              alt="INDAP"
              className="w-20 h-20 object-contain"
            />
          </div>
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

          {modo === 'login' && (
            <button
              onClick={() => setShowResetModal(true)}
              className="w-full text-center text-xs text-amber-600 hover:text-amber-700 mt-3 py-2"
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </div>
      </div>

      {/* Modal de recuperación de contraseña */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-gray-800">Recuperar contraseña</h3>
              </div>
              <button
                onClick={closeResetModal}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetMsg.text && (
              <div className={`text-sm rounded-lg px-3 py-3 ${resetMsg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {resetMsg.text}
              </div>
            )}

            {resetStep === 'solicitar' && (
              <>
                <p className="text-sm text-gray-600">
                  Ingresa tu correo para recibir un código temporal de 6 dígitos.
                </p>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full border border-gray-200 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
                <button
                  onClick={handleSolicitarCodigo}
                  disabled={!resetEmail.trim() || loading}
                  className="w-full btn-primary py-2.5 text-sm"
                >
                  {loading ? 'Enviando...' : 'Enviar código'}
                </button>
              </>
            )}

            {resetStep === 'codigo' && (
              <>
                <p className="text-sm text-gray-600">
                  Ingresa el código de 6 dígitos que recibiste.
                </p>
                <input
                  type="text"
                  value={resetCodigo}
                  onChange={e => setResetCodigo(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setResetStep('solicitar')}
                    className="flex-1 py-2.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                  >
                    <ArrowLeft className="w-4 h-4 mx-auto" />
                  </button>
                  <button
                    onClick={handleVerificarCodigo}
                    disabled={!resetCodigo.trim() || loading}
                    className="flex-1 btn-primary py-2.5 text-sm"
                  >
                    {loading ? 'Verificando...' : 'Verificar'}
                  </button>
                </div>
              </>
            )}

            {resetStep === 'nuevo' && (
              <>
                <p className="text-sm text-gray-600">
                  Ingresa tu nueva contraseña.
                </p>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={resetNuevoPassword}
                    onChange={e => setResetNuevoPassword(e.target.value)}
                    placeholder="Nueva contraseña"
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
                <div className="flex gap-2">
                  <button
                    onClick={() => setResetStep('codigo')}
                    className="flex-1 py-2.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                  >
                    <ArrowLeft className="w-4 h-4 mx-auto" />
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={!resetNuevoPassword.trim() || loading}
                    className="flex-1 btn-primary py-2.5 text-sm"
                  >
                    {loading ? 'Actualizando...' : 'Actualizar'}
                  </button>
                </div>
              </>
            )}

            <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-100">
              Contacto directo: mariocatalancabezas@gmail.com
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
