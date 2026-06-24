import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  Home, PlusCircle, ClipboardList,
  WifiOff, RefreshCw, CheckCircle2, AlertCircle, Menu, X, Users, LogOut, UserCircle,
  Stethoscope, FileText, FolderOpen, UsersRound, ChevronDown, ChevronRight, Lock, Building2, MessageSquare, HardHat
} from 'lucide-react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useSyncStatus } from '../hooks/useSyncStatus'
import { syncAll } from '../lib/sync'
import { useAuth } from '../lib/AuthContext'

const NAV_ALL = [
  {
    type: 'group',
    key: 'administrativo',
    icon: Building2,
    label: 'Administrativo',
    admin: false,
    items: [
      {
        type: 'group',
        key: 'diagnostico',
        icon: ClipboardList,
        label: 'Diagnóstico',
        items: [
          { to: '/nueva-visita', icon: PlusCircle, label: 'Nuevo Diagnóstico' },
          { to: '/historial', icon: ClipboardList, label: 'Historial Diagnósticos' },
        ],
      },
      {
        to: '/visita-administrativa',
        icon: FileText,
        label: 'Visita Administrativa',
      },
      {
        to: '/password-apicultores',
        icon: Lock,
        label: 'Password Apicultores',
        permission: 'puede_ver_password_apicultores',
      },
      {
        to: '/observaciones-apicultores',
        icon: MessageSquare,
        label: 'Observaciones Apicultores',
        permission: 'puede_ver_observaciones_apicultores',
        orPermissions: ['puede_ver_observaciones_secretaria', 'puede_ver_observaciones_tecnico_administrativa'],
      },
    ],
  },
  { type: 'item', to: '/', icon: Home, label: 'Inicio', admin: false },
  {
    type: 'group',
    key: 'visita-tecnica',
    icon: Stethoscope,
    label: 'Visita Técnica',
    admin: false,
    items: [
      { to: '/visita-tecnica', icon: Stethoscope, label: 'Nueva Visita Técnica' },
      { to: '/historial-visita-tecnica', icon: ClipboardList, label: 'Historial Visita Técnica' },
    ],
  },
  { type: 'item', to: '/apicultores', icon: UsersRound, label: 'Apicultores del programa', admin: false },
  { type: 'item', to: '/equipo-tecnico', icon: HardHat, label: 'Equipo Técnico', admin: false },
  { type: 'item', to: '/otras-planillas', icon: FolderOpen, label: 'Otras Planillas', admin: false },
  { type: 'item', to: '/usuarios', icon: Users, label: 'Usuarios', admin: true },
]

export default function Layout() {
  const isOnline = useOnlineStatus()
  const { syncStatus, pendingCount } = useSyncStatus()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState(() => {
    return new Set()
  })
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.rol === 'admin'
  function hasPermission(item) {
    if (isAdmin) return true
    // Si no tiene permisos específicos, es visible para todos
    if (!item.permission && !item.orPermissions) return true
    if (item.permission && user?.[item.permission]) return true
    if (item.orPermissions && item.orPermissions.some(p => user?.[p])) return true
    return false
  }

  function filterNode(node) {
    if (node.admin && !isAdmin) return null
    if (node.type === 'group') {
      const items = node.items.map(filterNode).filter(Boolean)
      if (items.length === 0) return null
      return { ...node, items }
    }
    return hasPermission(node) ? node : null
  }

  const NAV = NAV_ALL.map(filterNode).filter(Boolean)

  function firstLeafTo(node) {
    if (node.type === 'group') return firstLeafTo(node.items[0])
    return node.to
  }

  function toggleGroup(key) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function renderNavNode(node, depth = 0) {
    const iconSize = depth === 0 ? 'w-5 h-5' : 'w-4 h-4'
    const pad = depth === 0 ? 'py-2.5' : 'py-2'
    if (node.type === 'group') {
      const { key, icon: Icon, label, items } = node
      const isExpanded = expandedGroups.has(key)
      return (
        <div key={key} className="space-y-1">
          <button
            type="button"
            onClick={() => toggleGroup(key)}
            className={`w-full flex items-center justify-between px-3 ${pad} rounded-lg text-sm font-medium text-gray-600 hover:bg-honey-50 hover:text-honey-700 transition-colors`}
          >
            <div className="flex items-center gap-3">
              <Icon className={`${iconSize} flex-shrink-0`} />
              {label}
            </div>
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {isExpanded && (
            <div className="pl-4 space-y-1 border-l-2 border-honey-100 ml-4">
              {items.map(child => renderNavNode(child, depth + 1))}
            </div>
          )}
        </div>
      )
    }
    const { to, icon: Icon, label } = node
    return (
      <NavLink
        key={to}
        to={to}
        end={to === '/'}
        onClick={() => setMobileOpen(false)}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 ${pad} rounded-lg text-sm font-medium transition-colors ${
            isActive
              ? 'bg-honey-500 text-white shadow-sm'
              : 'text-gray-600 hover:bg-honey-50 hover:text-honey-700'
          }`
        }
      >
        <Icon className={`${iconSize} flex-shrink-0`} />
        {label}
      </NavLink>
    )
  }

  function StatusBadge() {
    if (!isOnline) return (
      <span className="badge-offline"><WifiOff className="w-3 h-3" /> Sin conexión</span>
    )
    if (syncStatus === 'syncing') return (
      <span className="badge-pending"><RefreshCw className="w-3 h-3 animate-spin" /> Sincronizando…</span>
    )
    if (syncStatus === 'error') return (
      <span className="badge-pending cursor-pointer bg-red-50 text-red-600" onClick={() => syncAll()}>
        <AlertCircle className="w-3 h-3" /> Error de sync
      </span>
    )
    if (pendingCount > 0) return (
      <span className="badge-pending cursor-pointer" onClick={() => syncAll()}>
        <AlertCircle className="w-3 h-3" /> {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
      </span>
    )
    return <span className="badge-synced"><CheckCircle2 className="w-3 h-3" /> Sincronizado</span>
  }

  return (
    <div className="min-h-screen flex bg-honey-50">

      {/* ── SIDEBAR desktop (md+) ──────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-60 xl:w-64 bg-white border-r border-honey-100 shadow-sm fixed inset-y-0 left-0 z-40">
        <div 
          onClick={() => navigate('/')}
          className="flex items-center gap-3 px-4 py-3 bg-honey-500 border-b border-honey-600 cursor-pointer hover:bg-honey-600 transition-colors"
        >
          <img
            src="/Logo/LOGO%20ASB.png.png"
            alt="Logo"
            className="w-10 h-10 object-contain"
          />
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">PAP Apícola Santa Bárbara-Indap</h1>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(item => renderNavNode(item))}
        </nav>
        <div className="px-4 py-3 border-t border-honey-100 space-y-2">
          <StatusBadge />
          <div className="flex items-center justify-between gap-1">
            <button onClick={() => navigate('/perfil')} className="flex items-center gap-2 min-w-0 flex-1 p-1.5 rounded-lg hover:bg-amber-50 transition-colors text-left">
              <UserCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-xs text-gray-600 truncate">{user?.nombre}</span>
            </button>
            <button onClick={handleLogout} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Cerrar sesión">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN AREA ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:ml-60 xl:ml-64 min-h-screen">

        {/* Top header mobile */}
        <header className="md:hidden bg-honey-500 text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-30">
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <img
              src="/Logo/LOGO%20ASB.png.png"
              alt="Logo"
              className="w-8 h-8 object-contain"
            />
            <div>
              <h1 className="font-bold text-sm leading-tight">PAP Apícola Santa Bárbara-Indap</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge />
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="p-1.5 rounded-lg bg-honey-600 hover:bg-honey-700"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile dropdown nav */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-b border-honey-100 shadow-md px-3 py-3 space-y-1 z-20">
            {NAV.map(item => renderNavNode(item))}
            <NavLink to="/perfil" onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-honey-500 text-white' : 'text-gray-600 hover:bg-honey-50 hover:text-honey-700'
                }`}
            >
              <UserCircle className="w-5 h-5 flex-shrink-0" />Mi perfil
            </NavLink>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
              <LogOut className="w-5 h-5 flex-shrink-0" />Cerrar sesión
            </button>
          </div>
        )}

        {/* Desktop top bar */}
        <header className="hidden md:flex items-center justify-between px-6 py-3 bg-white border-b border-honey-100 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              title="Volver al inicio"
            >
              <img
                src="/Logo/LOGO%20ASB.png.png"
                alt="Inicio"
                className="w-7 h-7 object-contain"
              />
            </button>
            <p className="text-sm font-medium text-gray-400">PAP Apícola Santa Bárbara-Indap — Sistema de Diagnóstico</p>
          </div>
          <StatusBadge />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6 fade-in">
          <div className="w-full max-w-5xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Bottom nav — mobile only */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-30">
          <ul className="flex justify-around">
            {NAV.slice(0, 4).map(item => {
              const to = firstLeafTo(item)
              const Icon = item.icon
              const label = item.label
              return (
                <li key={item.key || item.to} className="flex-1">
                  <NavLink
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `flex flex-col items-center py-2 text-xs gap-0.5 transition-colors ${
                        isActive ? 'text-honey-600 font-semibold' : 'text-gray-400 hover:text-gray-600'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5" />
                    <span>{label.split(' ')[0]}</span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
}
