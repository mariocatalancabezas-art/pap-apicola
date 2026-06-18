import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, ClipboardList, CalendarDays, CloudOff, Cloud } from 'lucide-react'
import { db } from '../lib/db'
import { syncAll, onSyncChange } from '../lib/sync'
import { isSupabaseConfigured } from '../lib/supabase'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export default function Dashboard() {
  const [stats, setStats] = useState({ visitas: 0, hoy: 0, pendientes: 0 })
  const [syncStatus, setSyncStatus] = useState('')
  const isOnline = useOnlineStatus()
  const supabaseOk = isSupabaseConfigured()

  async function load() {
    const hoy = new Date().toISOString().slice(0, 10)
    const [visitas, visitasHoy, pendientes] = await Promise.all([
      db.visitas.count(),
      db.visitas.where('f19_fecha_encuesta').equals(hoy).count(),
      db.visitas.where('sync_status').equals('pending').count(),
    ])
    setStats({ visitas, hoy: visitasHoy, pendientes })
  }

  useEffect(() => {
    load()
    if (supabaseOk) {
      const unsub = onSyncChange(status => {
        setSyncStatus(status)
        if (status === 'synced') load()
      })
      return unsub
    }
  }, [])

  const cards = [
    { label: 'Total diagnósticos', value: stats.visitas, icon: ClipboardList, color: 'bg-blue-50 text-blue-600' },
    { label: 'Encuestas hoy', value: stats.hoy, icon: CalendarDays, color: 'bg-green-50 text-green-600' },
    { label: 'Por sincronizar', value: stats.pendientes, icon: CloudOff, color: stats.pendientes > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400' },
  ]

  return (
    <div className="p-4 space-y-5">
      <div className="card bg-gradient-to-br from-honey-400 to-honey-600 text-white border-0">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🐝</span>
          <div>
            <h2 className="font-bold text-lg">Bienvenido</h2>
            <p className="text-honey-100 text-sm">PAP Apícola · Gestión de visitas</p>
          </div>
        </div>
      </div>

      {supabaseOk && (
        <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg ${
          syncStatus === 'syncing' ? 'bg-blue-50 text-blue-600' :
          syncStatus === 'synced'  ? 'bg-green-50 text-green-600' :
          syncStatus === 'error'   ? 'bg-red-50 text-red-600' :
          isOnline ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
        }`}>
          {isOnline
            ? <Cloud className="w-3.5 h-3.5" />
            : <CloudOff className="w-3.5 h-3.5" />}
          {syncStatus === 'syncing' ? 'Sincronizando…' :
           syncStatus === 'synced'  ? 'Sincronizado ✓' :
           syncStatus === 'error'   ? 'Error de sincronización' :
           isOnline ? 'En línea · sync automático activo' : 'Sin conexión · los datos se guardan localmente'}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-3">
            <div className={`p-2 rounded-lg ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Link to="/nueva-visita" className="btn-primary w-full flex items-center justify-center gap-2 py-3">
          <PlusCircle className="w-5 h-5" />
          Nuevo diagnóstico
        </Link>
        <Link to="/historial" className="btn-secondary w-full flex items-center justify-center gap-2 py-3">
          <ClipboardList className="w-5 h-5" />
          Historial de diagnósticos
        </Link>
      </div>
    </div>
  )
}
