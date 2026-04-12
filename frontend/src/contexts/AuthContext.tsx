import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, User } from '@/lib/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isLoggedIn: boolean
  login: (token: string, user: User) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 初始化：检查本地存储的 token
  useEffect(() => {
    const initAuth = async () => {
      const token = api.getToken()
      if (token) {
        try {
          const userData = await api.getMe()
          setUser(userData)
        } catch {
          // Token 无效，清除
          api.logout()
        }
      }
      setIsLoading(false)
    }
    initAuth()
  }, [])

  const login = useCallback((token: string, userData: User) => {
    localStorage.setItem('codediff_token', token)
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    api.logout()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const userData = await api.getMe()
      setUser(userData)
    } catch {
      logout()
    }
  }, [logout])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggedIn: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
