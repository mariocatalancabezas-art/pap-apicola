import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, CalendarDays, CloudOff, Cloud, User, FileText, Printer, Download, Stethoscope, MapPin } from 'lucide-react'
import { db } from '../lib/db'
import { listActividadesProximas, formatActividadFecha } from '../lib/actividades'
import { onSyncChange } from '../lib/sync'
import { isSupabaseConfigured } from '../lib/supabase'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { shareURL } from '../lib/exports'
import ShareButton from '../components/ShareButton'

export default function Dashboard() {
  const [stats, setStats] = useState({ visitas: 0, hoy: 0, pendientes: 0, tecnicas: 0, administrativas: 0 })

  // Función para imprimir/abrir PDF: usa un enlace <a> que funciona en móviles
  // (window.open suele ser bloqueado en teléfonos). Abre en nueva pestaña donde
  // el usuario puede imprimir desde el visor del navegador.
  function printPDF(url) {
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
  const [actividades, setActividades] = useState([])
  const [verTodas, setVerTodas] = useState(false)
  const isOnline = useOnlineStatus()
  const supabaseOk = isSupabaseConfigured()

  async function load() {
    const hoy = new Date().toISOString().slice(0, 10)
    // Contar solo los diagnósticos NO eliminados, igual que el Historial
    const activas = await db.visitas.filter(v => !v.deleted_at).toArray()
    const diagnosticos = activas.filter(v => v.tipo_visita !== 'administrativa' && v.tipo_visita !== 'tecnica')
    const visitas = diagnosticos.length
    const visitasHoy = diagnosticos.filter(v => v.f19_fecha_encuesta === hoy).length
    const pendientes = activas.filter(v => v.sync_status === 'pending').length
    const tecnicas = activas.filter(v => v.tipo_visita === 'tecnica').length
    const administrativas = activas.filter(v => v.tipo_visita === 'administrativa').length
    setStats({ visitas, hoy: visitasHoy, pendientes, tecnicas, administrativas })
  }

  async function loadActividades() {
    if (!supabaseOk) return
    try {
      setActividades(await listActividadesProximas())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    load()
    loadActividades()
    if (supabaseOk) {
      const unsub = onSyncChange(status => {
        setSyncStatus(status)
        if (status === 'synced') load()
      })
      return unsub
    }
  }, [])

  const cards = [
    { label: 'Total diagnósticos', value: stats.visitas, icon: ClipboardList, color: 'bg-blue-50 text-blue-600', to: '/historial' },
    { label: 'Total visitas técnicas', value: stats.tecnicas, icon: Stethoscope, color: 'bg-green-50 text-green-600', to: '/historial-visita-tecnica' },
    { label: 'Total visitas administrativas', value: stats.administrativas, icon: FileText, color: 'bg-purple-50 text-purple-600', to: '/historial-visita-administrativa' },
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
           isOnline ? 'En línea · sincronización automática activa' : 'Sin conexión · datos locales'}
        </div>
      )}

      {/* ── PRÓXIMAS ACTIVIDADES ───────────────────────────────────── */}
      <div className="card bg-white border border-gray-200">
        <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-honey-500" />
          Próximas actividades
        </h3>
        {actividades.length === 0 ? (
          <p className="text-sm text-gray-500">No hay actividades programadas.</p>
        ) : (
          <div className="space-y-3">
            {(verTodas ? actividades : actividades.slice(0, 4)).map(a => (
              <div key={a.id} className="flex items-start gap-3 border border-gray-100 rounded-lg p-3.5 bg-gray-50">
                <div className="p-2 rounded-lg bg-honey-50 text-honey-600 flex-shrink-0">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-gray-800">{a.actividad}</p>
                  <p className="text-sm text-gray-500 capitalize">{formatActividadFecha(a.fecha, a.hora)}</p>
                  {a.lugar && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" /> {a.lugar}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {actividades.length > 4 && (
              !verTodas ? (
                <button
                  onClick={() => setVerTodas(true)}
                  className="w-full text-sm text-honey-600 hover:text-honey-700 font-medium py-1"
                >
                  Ver más… ({actividades.length - 4})
                </button>
              ) : (
                <Link
                  to="/calendario-actividades"
                  className="block w-full text-center text-sm text-honey-600 hover:text-honey-700 font-medium py-1"
                >
                  Ir al calendario
                </Link>
              )
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map(({ label, value, icon: Icon, color, to }) => (
          <Link
            key={label}
            to={to}
            className="card flex items-center gap-3 p-3 sm:p-4 hover:bg-honey-50 transition-colors cursor-pointer"
          >
            <div className={`p-2 sm:p-2.5 rounded-lg ${color} flex-shrink-0`}>
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xl sm:text-2xl font-bold text-gray-800">{value}</p>
              <p className="text-xs sm:text-sm text-gray-500 truncate">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="space-y-2">
        <Link to="/apicultores" className="btn-primary w-full flex items-center justify-center gap-2 py-3">
          <User className="w-5 h-5" />
          Apicultores del programa
        </Link>
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
            <div className="grid grid-cols-3 gap-2">
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
              <ShareButton onClick={() => shareURL('/Planillas/Manual%20Apicultor(a)%20SIPEC%20Ap%C3%ADcola%202026.pdf', 'Manual_Apicola_SIPEC_2026.pdf')} title="Compartir manual" size="sm" className="mx-auto" />
            </div>
          </div>

          {/* Registros SAG */}
          <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-2">Registros SAG</p>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => printPDF('/Planillas/Registros%20SAG.pdf')}
                className="btn-secondary flex items-center justify-center gap-1.5 py-2 text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </button>
              <button 
                onClick={() => downloadPDF('/Planillas/Registros%20SAG.pdf', 'Registros_SAG.pdf')}
                className="btn-secondary flex items-center justify-center gap-1.5 py-2 text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar
              </button>
              <ShareButton onClick={() => shareURL('/Planillas/Registros%20SAG.pdf', 'Registros_SAG.pdf')} title="Compartir registros" size="sm" className="mx-auto" />
            </div>
          </div>

          {/* Pauta Sala Primaria SAG */}
          <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-2">Pauta Sala Primaria SAG</p>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => printPDF('/Planillas/PAUTA%20SALA%20PRIMARIA.pdf')}
                className="btn-secondary flex items-center justify-center gap-1.5 py-2 text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </button>
              <button 
                onClick={() => downloadPDF('/Planillas/PAUTA%20SALA%20PRIMARIA.pdf', 'PAUTA_SALA_PRIMARIA.pdf')}
                className="btn-secondary flex items-center justify-center gap-1.5 py-2 text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar
              </button>
              <ShareButton onClick={() => shareURL('/Planillas/PAUTA%20SALA%20PRIMARIA.pdf', 'PAUTA_SALA_PRIMARIA.pdf')} title="Compartir pauta" size="sm" className="mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
