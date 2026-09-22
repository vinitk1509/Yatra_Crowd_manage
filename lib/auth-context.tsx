'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { apiRequest } from './api-client'

export type UserRole =
  | 'ADMIN'
  | 'CONTROL_ROOM_OPERATOR'
  | 'CHECKPOINT_OPERATOR'
  | 'EMERGENCY_OFFICER'
  | 'SUPERVISOR'
  | 'PILGRIM'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export interface AuthResponseData {
  token: string
  tokenType: string
  expiresIn: number
  user: User
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (name: string, email: string, password: string, role: UserRole) => Promise<User>
  logout: () => void
  switchDemoRole: (role: UserRole) => Promise<void>
  checkBackendHealth: () => Promise<boolean>
  backendOnline: boolean | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string }> = {
  ADMIN: { email: 'admin@yatraflow.gov.in', pass: 'Admin@12345' },
  CONTROL_ROOM_OPERATOR: { email: 'control@yatraflow.gov.in', pass: 'Control@12345' },
  CHECKPOINT_OPERATOR: { email: 'checkpoint@yatraflow.gov.in', pass: 'Checkpoint@12345' },
  EMERGENCY_OFFICER: { email: 'emergency@yatraflow.gov.in', pass: 'Emergency@12345' },
  SUPERVISOR: { email: 'supervisor@yatraflow.gov.in', pass: 'Supervisor@12345' },
  PILGRIM: { email: 'pilgrim@yatraflow.gov.in', pass: 'Pilgrim@12345' },
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)

  useEffect(() => {
    const savedToken = localStorage.getItem('yatra_token')
    const savedUser = localStorage.getItem('yatra_user')

    if (savedToken && savedUser) {
      try {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem('yatra_token')
        localStorage.removeItem('yatra_user')
      }
    }

    // Verify token validity by calling /api/auth/me
    if (savedToken) {
      apiRequest<User>('/api/auth/me')
        .then((res) => {
          if (res.success && res.data) {
            setUser(res.data)
            localStorage.setItem('yatra_user', JSON.stringify(res.data))
            setBackendOnline(true)
          }
        })
        .catch(() => {
          setBackendOnline(false)
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [])

  const checkBackendHealth = async (): Promise<boolean> => {
    try {
      const res = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '', password: '' }),
      })
      const isUp = res.status !== 0
      setBackendOnline(isUp)
      return isUp
    } catch {
      setBackendOnline(false)
      return false
    }
  }

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true)
    try {
      const response = await apiRequest<AuthResponseData>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      const authData = response.data
      setToken(authData.token)
      setUser(authData.user)
      localStorage.setItem('yatra_token', authData.token)
      localStorage.setItem('yatra_user', JSON.stringify(authData.user))
      setBackendOnline(true)
      return authData.user
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (
    name: string,
    email: string,
    password: string,
    role: UserRole
  ): Promise<User> => {
    setIsLoading(true)
    try {
      const response = await apiRequest<AuthResponseData>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      })

      const authData = response.data
      setToken(authData.token)
      setUser(authData.user)
      localStorage.setItem('yatra_token', authData.token)
      localStorage.setItem('yatra_user', JSON.stringify(authData.user))
      setBackendOnline(true)
      return authData.user
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('yatra_token')
    localStorage.removeItem('yatra_user')
  }

  const switchDemoRole = async (role: UserRole) => {
    const creds = DEMO_CREDENTIALS[role]
    if (creds) {
      await login(creds.email, creds.pass)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
        switchDemoRole,
        checkBackendHealth,
        backendOnline,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
