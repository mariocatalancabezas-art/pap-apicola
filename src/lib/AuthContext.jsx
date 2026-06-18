import React, { createContext, useContext, useState, useEffect } from 'react'
import { getSession, logout as doLogout } from './auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getSession())

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
