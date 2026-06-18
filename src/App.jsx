import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import NuevaVisita from './pages/NuevaVisita'
import Historial from './pages/Historial'
import Apicultores from './pages/Apicultores'
import NuevoApicultor from './pages/NuevoApicultor'
import EditarApicultor from './pages/EditarApicultor'
import EditarVisita from './pages/EditarVisita'
import Backups from './pages/Backups'
import Configuracion from './pages/Configuracion'
import Login from './pages/Login'
import Usuarios from './pages/Usuarios'
import Perfil from './pages/Perfil'
import VisitaTecnica from './pages/VisitaTecnica'
import VisitaAdministrativa from './pages/VisitaAdministrativa'
import OtrasPlanillas from './pages/OtrasPlanillas'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { setupAutoSync } from './lib/sync'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { user } = useAuth()

  useEffect(() => {
    setupAutoSync()
  }, [])

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="nueva-visita" element={<NuevaVisita />} />
        <Route path="historial" element={<Historial />} />
        <Route path="visita/editar/:id" element={<EditarVisita />} />
        <Route path="apicultores" element={<Apicultores />} />
        <Route path="apicultores/nuevo" element={<NuevoApicultor />} />
        <Route path="apicultores/editar/:id" element={<EditarApicultor />} />
        <Route path="backups" element={<Backups />} />
        <Route path="configuracion" element={<Configuracion />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="visita-tecnica" element={<VisitaTecnica />} />
        <Route path="visita-administrativa" element={<VisitaAdministrativa />} />
        <Route path="otras-planillas" element={<OtrasPlanillas />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
