import React, { createContext, useContext, useState, useEffect } from 'react'
import { getSession, logout as doLogout, refreshSession } from './auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getSession())

  useEffect(() => {
    let cancelled = false
    async function refrescar() {
      if (!getSession()) return
      try {
        const s = await refreshSession()
        if (!cancelled) setUser(s)
      } catch { /* sin conexión: se mantiene la sesión guardada */ }
    }
    refrescar()
    const onVisible = () => { if (document.visibilityState === 'visible') refrescar() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', refrescar)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', refrescar)
    }
  }, [])

  function login(session) {
    setUser(session)
  }

  function logout() {
    doLogout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
