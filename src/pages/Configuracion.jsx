import React, { useState, useEffect } from 'react'
import { Save, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react'
import { isSupabaseConfigured } from '../lib/supabase'

export default function Configuracion() {
  const [supabaseUrl, setSupabaseUrl] = useState(import.meta.env.VITE_SUPABASE_URL || '')
  const [anonKey, setAnonKey] = useState(import.meta.env.VITE_SUPABASE_ANON_KEY || '')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const configured = isSupabaseConfigured()

  function handleSave(e) {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold">Configuración</h2>

      <div className="card space-y-2">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Estado de Supabase</h3>
        {configured ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm">Supabase configurado y activo</span>
          </div>
        ) : (
          <div className="flex items-start gap-2 text-amber-600">
            <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Supabase no configurado</p>
              <p className="text-gray-500 text-xs mt-1">La aplicación funciona en modo offline. Para activar la sincronización, añade las variables de entorno en el archivo <code className="bg-gray-100 px-1 rounded">.env</code> del proyecto.</p>
            </div>
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Instrucciones de configuración</h3>
        <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          <li>Crea un proyecto en <strong>supabase.com</strong></li>
          <li>Ve a Settings → API y copia la URL y la clave anon</li>
          <li>Crea el archivo <code className="bg-gray-100 px-1 rounded text-xs">.env</code> en la raíz del proyecto con:
            <pre className="mt-1 bg-gray-50 rounded p-2 text-xs overflow-x-auto">
{`VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...`}
            </pre>
          </li>
          <li>Ejecuta las migraciones SQL (ver <code className="bg-gray-100 px-1 rounded text-xs">supabase/migrations/</code>)</li>
          <li>Reinicia el servidor de desarrollo</li>
        </ol>
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Información de la app</h3>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Versión</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Última sincronización</span>
            <span className="font-medium text-xs">
              {localStorage.getItem('last_sync_at')
                ? new Date(localStorage.getItem('last_sync_at')).toLocaleString('es-ES')
                : 'Nunca'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Modo offline</span>
            <span className="badge-synced text-xs">Activo</span>
          </div>
        </div>
      </div>
    </div>
  )
}
