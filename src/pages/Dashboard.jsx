import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, CalendarDays, CloudOff, Cloud, User, FileText, Printer, Download, RefreshCw } from 'lucide-react'
import { db } from '../lib/db'
import { syncAll, onSyncChange } from '../lib/sync'
import { isSupabaseConfigured } from '../lib/supabase'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export default function Dashboard() {
  const [stats, setStats] = useState({ visitas: 0, hoy: 0, pendientes: 0 })

  // Función para imprimir PDF directamente
  function printPDF(url) {
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.width = '1px'
    iframe.style.height = '1px'
    iframe.style.opacity = '0'
    iframe.src = url
    document.body.appendChild(iframe)
    
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow.focus()
          iframe.contentWindow.print()
        } catch (e) {
          // Fallback: abrir en nueva pestaña
          window.open(url, '_blank')
        }
        // Limpiar iframe después de un tiempo
        setTimeout(() => document.body.removeChild(iframe), 1000)
      }, 500)
    }
  }

  // Función para descargar PDF
  function downloadPDF(url, filename) {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
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
          <div className="flex items-center gap-2">
            <img
              src="/Logo/LOGO%20ASB.png.png"
              alt="PAP Apícola"
              className="w-12 h-12 object-contain drop-shadow-md rounded-full bg-white"
            />
            <img
              src="/Logo/LOGO%20INDAP.png"
              alt="INDAP"
              className="w-10 h-10 object-contain drop-shadow-md rounded bg-white p-0.5"
            />
          </div>
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
        <Link to="/apicultores" className="btn-primary w-full flex items-center justify-center gap-2 py-3">
          <User className="w-5 h-5" />
          Apicultores del programa
        </Link>
        <Link to="/historial" className="btn-secondary w-full flex items-center justify-center gap-2 py-3">
          <ClipboardList className="w-5 h-5" />
          Historial de diagnósticos
        </Link>
      </div>

      {/* ── SINCRONIZACIÓN ─────────────────────────────────────────── */}
      <div className="card bg-amber-50 border border-amber-200">
        <h3 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-amber-500" />
          Sincronización
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Si los datos no aparecen correctamente en todos tus dispositivos, usa la sincronización completa.
        </p>
        <button 
          onClick={async () => {
            const { syncAll } = await import('../lib/sync')
            await syncAll(true) // force full sync
            alert('✓ Sincronización completa realizada. Recarga la página si es necesario.')
          }}
          className="btn-secondary w-full flex items-center justify-center gap-2 py-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Forzar sincronización completa
        </button>
      </div>

      {/* ── DOCUMENTOS SAG ─────────────────────────────────────────── */}
      <div className="card bg-white border border-gray-200">
        <h3 className="font-bold text-gray-700 text-sm mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-500" />
          Documentos SAG
        </h3>
        
        <div className="space-y-4">
          {/* Manual SIPEC */}
          <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-2">Manual Apicultor(a) SIPEC Apícola 2026</p>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => printPDF('/Planillas/Manual%20Apicultor(a)%20SIPEC%20Ap%C3%ADcola%202026.pdf')}
                className="btn-secondary flex items-center justify-center gap-1.5 py-2 text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </button>
              <button 
                onClick={() => downloadPDF('/Planillas/Manual%20Apicultor(a)%20SIPEC%20Ap%C3%ADcola%202026.pdf', 'Manual_Apicola_SIPEC_2026.pdf')}
                className="btn-secondary flex items-center justify-center gap-1.5 py-2 text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar
              </button>
            </div>
          </div>

          {/* Registros RAMEX */}
          <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-2">Registros RAMEX SAG</p>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => printPDF('/Planillas/Registros_PC_SAG.pdf')}
                className="btn-secondary flex items-center justify-center gap-1.5 py-2 text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </button>
              <button 
                onClick={() => downloadPDF('/Planillas/Registros_PC_SAG.pdf', 'Registros_PC_SAG.pdf')}
                className="btn-secondary flex items-center justify-center gap-1.5 py-2 text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar
              </button>
            </div>
          </div>

          {/* Pauta Sala Primaria SAG */}
          <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-2">Pauta Sala Primaria SAG</p>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => printPDF('/Planillas/Pauta_Sala_Primaria_SAG.pdf')}
                className="btn-secondary flex items-center justify-center gap-1.5 py-2 text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </button>
              <button 
                onClick={() => downloadPDF('/Planillas/Pauta_Sala_Primaria_SAG.pdf', 'Pauta_Sala_Primaria_SAG.pdf')}
                className="btn-secondary flex items-center justify-center gap-1.5 py-2 text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
