import React, { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  setSession: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('lms_token'))
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me')
      setUser(res.data.user)
    } catch {
      localStorage.removeItem('lms_token')
      setToken(null)
      setUser(null)
    }
  }

  useEffect(() => {
    if (token) {
      refreshUser().finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    const { token: jwt, user: loggedInUser } = res.data
    localStorage.setItem('lms_token', jwt)
    setToken(jwt)
    setUser(loggedInUser)
  }

  const logout = () => {
    localStorage.removeItem('lms_token')
    setToken(null)
    setUser(null)
  }

  const setSession = (u: User) => setUser(u)

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser, setSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
