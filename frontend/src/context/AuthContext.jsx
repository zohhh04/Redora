import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const restoreSession = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return { ok: false, code: 'none' }
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.user)
      return { ok: true, code: 'ok' }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token')
        return { ok: false, code: 'invalid' }
      }
      return { ok: false, code: 'network' }
    }
  }, [])

  useEffect(() => {
    restoreSession().finally(() => setLoading(false))
  }, [restoreSession])

  const login = (token, userData) => {
    localStorage.setItem('token', token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const updateUser = (userData) => setUser(userData)

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, restoreSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
