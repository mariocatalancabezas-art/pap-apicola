import React, { useEffect, useState, useRef } from 'react'
import { Lock, Eye, EyeOff, Save, Search, KeyRound, Copy, Check, Settings } from 'lucide-react'
import { db, SYNC_STATUS } from '../lib/db'
import { useAuth } from '../lib/AuthContext'
import { syncAll } from '../lib/sync'

const PIN_KEY = 'pap_password_pin'
const DEFAULT_PIN = '162126'

function getPin() {
  return localStorage.getItem(PIN_KEY) || DEFAULT_PIN
}

function setPin(pin) {
  localStorage.setItem(PIN_KEY, pin)
}

function formatearRut(rut) {
  if (!rut) return '—'
  const limpio = String(rut).replace(/[^0-9kK]/g, '').toUpperCase()
  if (limpio.length < 2) return rut
  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  const formateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formateado}-${dv}`
}

function primerNombre(nombres) {
  return (nombres || '').trim().split(/\s+/)[0] || ''
}

function primerApellido(apellidos) {
  return (apellidos || '').trim().split(/\s+/)[0] || ''
}

function copiar(texto, setCopied) {
  if (!texto) return
  navigator.clipboard.writeText(texto).then(() => {
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  })
}

function CeldaCopiable({ valor, label, oculto = false, tipo = 'text' }) {
  const [copied, setCopied] = useState(false)
  const mostrar = oculto ? '••••' : (valor || '')
  return (
    <div className="flex items-center gap-1 min-w-[70px] max-w-[110px]">
      <span className={`flex-1 truncate text-[11px] ${tipo === 'password' && !oculto ? 'font-mono' : ''}`} title={oculto ? '' : valor}>
        {mostrar || '—'}
      </span>
      {valor && (
        <button
          type="button"
          onClick={() => copiar(valor, setCopied)}
          className="p-0.5 rounded text-gray-400 hover:bg-gray-100 hover:text-honey-600 flex-shrink-0"
          title={`Copiar ${label}`}
        >
          {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
        </button>
      )}
    </div>
  )
}

export default function PasswordApicultores() {
  const { user } = useAuth()
  const esAdmin = user?.rol === 'admin'
  const puedeVer = esAdmin || user?.puede_ver_password_apicultores === true
  const puedeEditar = esAdmin || user?.puede_editar_password_apicultores === true

  const [desbloqueado, setDesbloqueado] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [mostrarPin, setMostrarPin] = useState(false)
  const [cambiarPin, setCambiarPin] = useState(false)
  const [nuevoPin, setNuevoPin] = useState('')
  const [confirmarPin, setConfirmarPin] = useState('')

  const [apicultores, setApicultores] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [showPassword, setShowPassword] = useState({})
  const [draft, setDraft] = useState({})
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [])

  useEffect(() => {
    return () => {
      // Al salir de la pantalla se bloquea nuevamente
      setDesbloqueado(false)
    }
  }, [])

  async function cargar() {
    setLoading(true)
    try {
      const all = await db.apicultores
        .filter(a => !a.deleted_at)
        .sortBy('nombre_completo')
      // Dejar solo un registro por nombre completo (evita duplicados visuales)
      const seen = new Set()
      const unicos = []
      for (const a of all) {
        const key = (a.nombre_completo || '').trim().toUpperCase()
        if (!key || seen.has(key)) continue
        seen.add(key)
        unicos.push(a)
      }
      setApicultores(unicos)
    } catch (err) {
      setMsg('✗ Error al cargar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (desbloqueado) cargar()
  }, [desbloqueado])

  function verificarPin() {
    if (pinInput === getPin()) {
      setDesbloqueado(true)
      setPinError('')
    } else {
      setPinError('Clave incorrecta')
      setDesbloqueado(false)
    }
  }

  function guardarNuevoPin() {
    if (nuevoPin.length < 4) {
      setMsg('✗ La clave debe tener al menos 4 dígitos')
      return
    }
    if (nuevoPin !== confirmarPin) {
      setMsg('✗ Las claves no coinciden')
      return
    }
    setPin(nuevoPin)
    setMsg('✓ Clave actualizada')
    setCambiarPin(false)
    setNuevoPin('')
    setConfirmarPin('')
  }

  const filtered = apicultores.filter(a => {
    const texto = search.toLowerCase()
    const nombre = `${primerNombre(a.nombres)} ${primerApellido(a.apellidos)}`.toLowerCase()
    return nombre.includes(texto) || (a.rut || '').toLowerCase().includes(texto)
  })

  function toggleShow(id) {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function handleChange(id, campo, value) {
    setDraft(prev => ({ ...prev, [`${id}-${campo}`]: value }))
  }

  function getValor(a, campo) {
    const key = `${a.id}-${campo}`
    return draft[key] !== undefined ? draft[key] : (a[campo] || '')
  }

  function hayCambios(a) {
    return ['usuario_sipec', 'contraseña_sipec', 'contraseña_sii'].some(c => draft[`${a.id}-${c}`] !== undefined)
  }

  async function guardar(a) {
    const cambios = {}
    const campos = ['usuario_sipec', 'contraseña_sipec', 'contraseña_sii']
    campos.forEach(c => {
      if (draft[`${a.id}-${c}`] !== undefined) cambios[c] = draft[`${a.id}-${c}`]
    })
    if (Object.keys(cambios).length === 0) return

    setSavingId(a.id)
    try {
      const now = new Date().toISOString()
      await db.apicultores.update(a.id, {
        ...cambios,
        updated_at: now,
        sync_status: SYNC_STATUS.PENDING,
      })
      setMsg('✓ Datos guardados')
      campos.forEach(c => {
        setDraft(prev => ({ ...prev, [`${a.id}-${c}`]: undefined }))
      })
      syncAll(true).catch(err => console.error('Sync error:', err))
    } catch (err) {
      setMsg('✗ Error: ' + err.message)
    } finally {
      setSavingId(null)
    }
  }

  if (!puedeVer) {
    return (
      <div className="p-4">
        <div className="card bg-red-50 border-red-200 text-red-700 text-sm">
          No tienes permisos para ver esta página.
        </div>
      </div>
    )
  }

  if (!desbloqueado) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[60vh]">
        <div className="card w-full max-w-sm space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <Lock className="w-6 h-6 text-honey-600" />
            <h2 className="text-lg font-bold text-center">Password Apicultores</h2>
          </div>
          <p className="text-sm text-gray-500 text-center">
            Ingresa la clave para acceder a este menú.
          </p>
          <div className="relative">
            <input
              ref={inputRef}
              type={mostrarPin ? 'text' : 'password'}
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && verificarPin()}
              placeholder="Clave"
              className="input-field w-full pr-10"
            />
            <button
              type="button"
              onClick={() => setMostrarPin(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {mostrarPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {pinError && <p className="text-sm text-red-600 text-center">{pinError}</p>}
          <button
            type="button"
            onClick={verificarPin}
            className="w-full btn-primary py-2.5"
          >
            Acceder
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-honey-600" />
          <h2 className="text-lg font-bold">Password Apicultores</h2>
        </div>
        <div className="flex items-center gap-2">
          {esAdmin && (
            <button
              type="button"
              onClick={() => setCambiarPin(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-medium"
            >
              <Settings className="w-3.5 h-3.5" /> Cambiar clave
            </button>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o RUT…"
              className="input-field pl-9 w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {cambiarPin && esAdmin && (
        <div className="card bg-honey-50 border-honey-200 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Cambiar clave de acceso</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="password"
              value={nuevoPin}
              onChange={e => setNuevoPin(e.target.value)}
              placeholder="Nueva clave"
              className="input-field"
            />
            <input
              type="password"
              value={confirmarPin}
              onChange={e => setConfirmarPin(e.target.value)}
              placeholder="Confirmar clave"
              className="input-field"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={guardarNuevoPin}
              className="px-2 py-1 rounded-lg bg-honey-100 text-honey-700 hover:bg-honey-200 text-xs font-medium"
            >
              Guardar clave
            </button>
            <button
              type="button"
              onClick={() => { setCambiarPin(false); setNuevoPin(''); setConfirmarPin('') }}
              className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {msg && (
        <div className={`card text-sm font-medium ${msg.startsWith('✓') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {msg}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 text-center py-8">Cargando…</p>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs table-fixed">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="w-[120px] px-1 py-1 text-left text-[11px] font-semibold text-gray-600">Apicultor</th>
                  <th className="w-[95px] px-1 py-1 text-left text-[11px] font-semibold text-gray-600">RUT</th>
                  <th className="w-[160px] px-1 py-1 text-left text-[11px] font-semibold text-gray-600">Usuario SIPEC</th>
                  <th className="w-[160px] px-1 py-1 text-left text-[11px] font-semibold text-gray-600">Contraseña SIPEC</th>
                  <th className="w-[160px] px-1 py-1 text-left text-[11px] font-semibold text-gray-600">Contraseña SII</th>
                  {puedeEditar && <th className="w-[55px] px-1 py-1 text-left text-[11px] font-semibold text-gray-600">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(a => {
                  const id = a.id
                  const isDirty = hayCambios(a)
                  const nombreCorto = `${primerNombre(a.nombres)} ${primerApellido(a.apellidos)}`.trim()
                  return (
                    <tr key={id} className="hover:bg-gray-50">
                      <td className="px-1 py-1 text-[11px] font-medium text-gray-800 truncate" title={nombreCorto || a.nombre_completo}>{nombreCorto || a.nombre_completo}</td>
                      <td className="px-1 py-1 text-gray-600">
                        <CeldaCopiable valor={formatearRut(a.rut)} label="RUT" />
                      </td>
                      <td className="px-1 py-1">
                        {puedeEditar ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={getValor(a, 'usuario_sipec')}
                              onChange={e => handleChange(id, 'usuario_sipec', e.target.value)}
                              className="input-field w-20 px-1 py-0.5 text-[11px]"
                              placeholder="—"
                            />
                            <CeldaCopiable valor={getValor(a, 'usuario_sipec')} label="Usuario SIPEC" />
                          </div>
                        ) : (
                          <CeldaCopiable valor={a.usuario_sipec} label="Usuario SIPEC" />
                        )}
                      </td>
                      <td className="px-1 py-1">
                        {puedeEditar ? (
                          <div className="flex items-center gap-1">
                            <div className="relative w-20">
                              <input
                                type={showPassword[id] ? 'text' : 'password'}
                                value={getValor(a, 'contraseña_sipec')}
                                onChange={e => handleChange(id, 'contraseña_sipec', e.target.value)}
                                className="input-field w-full px-1 py-0.5 text-[11px]"
                                placeholder="—"
                              />
                            </div>
                            <CeldaCopiable valor={getValor(a, 'contraseña_sipec')} label="Contraseña SIPEC" oculto={!showPassword[id]} tipo="password" />
                            <button
                              type="button"
                              onClick={() => toggleShow(id)}
                              className="p-0.5 rounded text-gray-400 hover:bg-gray-100"
                              title={showPassword[id] ? 'Ocultar' : 'Mostrar'}
                            >
                              {showPassword[id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        ) : (
                          <CeldaCopiable valor={a.contraseña_sipec} label="Contraseña SIPEC" oculto={!showPassword[id]} tipo="password" />
                        )}
                      </td>
                      <td className="px-1 py-1">
                        {puedeEditar ? (
                          <div className="flex items-center gap-1">
                            <div className="relative w-20">
                              <input
                                type={showPassword[id + '-sii'] ? 'text' : 'password'}
                                value={getValor(a, 'contraseña_sii')}
                                onChange={e => handleChange(id, 'contraseña_sii', e.target.value)}
                                className="input-field w-full px-1 py-0.5 text-[11px]"
                                placeholder="—"
                              />
                            </div>
                            <CeldaCopiable valor={getValor(a, 'contraseña_sii')} label="Contraseña SII" oculto={!showPassword[id + '-sii']} tipo="password" />
                            <button
                              type="button"
                              onClick={() => setShowPassword(prev => ({ ...prev, [id + '-sii']: !prev[id + '-sii'] }))}
                              className="p-0.5 rounded text-gray-400 hover:bg-gray-100"
                              title={showPassword[id + '-sii'] ? 'Ocultar' : 'Mostrar'}
                            >
                              {showPassword[id + '-sii'] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        ) : (
                          <CeldaCopiable valor={a.contraseña_sii} label="Contraseña SII" oculto={!showPassword[id + '-sii']} tipo="password" />
                        )}
                      </td>
                      {puedeEditar && (
                        <td className="px-1 py-1">
                          <button
                            type="button"
                            disabled={!isDirty || savingId === id}
                            onClick={() => guardar(a)}
                            className={`flex items-center justify-center p-1 rounded-lg transition-colors ${
                              isDirty
                                ? 'bg-honey-100 text-honey-700 hover:bg-honey-200'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                            title={savingId === id ? 'Guardando…' : 'Guardar'}
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={puedeEditar ? 6 : 5} className="px-3 py-6 text-center text-gray-500 text-sm">
                      No se encontraron apicultores.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
