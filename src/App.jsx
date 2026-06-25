import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import NuevaVisita from './pages/NuevaVisita'
import Historial from './pages/Historial'
import Apicultores from './pages/Apicultores'
import EditarVisita from './pages/EditarVisita'
import Backups from './pages/Backups'
import Login from './pages/Login'
import Usuarios from './pages/Usuarios'
import Perfil from './pages/Perfil'
import VisitaTecnica from './pages/VisitaTecnica'
import VisitaAdministrativa from './pages/VisitaAdministrativa'
import HistorialVisitaTecnica from './pages/HistorialVisitaTecnica'
import HistorialVisitaAdministrativa from './pages/HistorialVisitaAdministrativa'
import OtrasPlanillas from './pages/OtrasPlanillas'
import PasswordApicultores from './pages/PasswordApicultores'
import ObservacionesApicultores from './pages/ObservacionesApicultores'
import ObservacionesApicultorDetail from './pages/ObservacionesApicultorDetail'
import PlanillaAsistenciaActividades from './pages/PlanillaAsistenciaActividades'
import PlanillaAsistenciaGeneralVisitas from './pages/PlanillaAsistenciaGeneralVisitas'
import PlanillaAsistenciaReunionesEquipo from './pages/PlanillaAsistenciaReunionesEquipo'
import EquipoTecnico from './pages/EquipoTecnico'
import CalendarioActividades from './pages/CalendarioActividades'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { initApicultores } from './lib/initApicultores'
import { setupAutoSync } from './lib/sync'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { user } = useAuth()

  useEffect(() => {
    // Cargar apicultores automáticamente
    initApicultores().catch(console.error)
    setupAutoSync()
  }, [user])

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="nueva-visita" element={<NuevaVisita />} />
        <Route path="historial" element={<Historial />} />
        <Route path="visita/editar/:id" element={<EditarVisita />} />
        <Route path="apicultores" element={<Apicultores />} />
        <Route path="equipo-tecnico" element={<EquipoTecnico />} />
        <Route path="backups" element={<Backups />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="visita-tecnica" element={<VisitaTecnica />} />
        <Route path="visita-tecnica/editar/:id" element={<VisitaTecnica />} />
        <Route path="visita-administrativa" element={<VisitaAdministrativa />} />
        <Route path="visita-administrativa/editar/:id" element={<VisitaAdministrativa />} />
        <Route path="historial-visita-tecnica" element={<HistorialVisitaTecnica />} />
        <Route path="historial-visita-administrativa" element={<HistorialVisitaAdministrativa />} />
        <Route path="otras-planillas" element={<OtrasPlanillas />} />
        <Route path="calendario-actividades" element={<CalendarioActividades />} />
        <Route path="password-apicultores" element={<PasswordApicultores />} />
        <Route path="observaciones-apicultores" element={<ObservacionesApicultores />} />
        <Route path="observaciones-apicultores/:id/:tipo" element={<ObservacionesApicultorDetail />} />
        <Route path="planilla-asistencia-actividades" element={<PlanillaAsistenciaActividades />} />
        <Route path="planilla-asistencia-general-visitas" element={<PlanillaAsistenciaGeneralVisitas />} />
        <Route path="planilla-asistencia-reuniones-equipo" element={<PlanillaAsistenciaReunionesEquipo />} />
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
