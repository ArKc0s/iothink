import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode
} from 'react'
import axios from 'axios'
import { jwtDecode } from 'jwt-decode'

interface AuthContextType {
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('accessToken')
  )
  const isAuthenticated = Boolean(token)

  // Synchronise le localStorage
  useEffect(() => {
    if (token) localStorage.setItem('accessToken', token)
    else localStorage.removeItem('accessToken')
  }, [token])

  // Fonction pour rafraîchir le token via /refresh
  const refreshToken = async () => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/refresh`,
        {},
        { withCredentials: true }
      )
      setToken(res.data.accessToken)
    } catch {
      setToken(null)
    }
  }

  // Programme un auto-refresh 30s avant expiration
  useEffect(() => {
    if (!token) return
    const { exp } = jwtDecode<{ exp: number }>(token)
    const delay = exp * 1000 - Date.now() - 30_000
    const id = setTimeout(refreshToken, Math.max(delay, 0))
    return () => clearTimeout(id)
  }, [token])

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/login`,
        { username, password },
        { withCredentials: true }
      )
      setToken(res.data.accessToken)
      return true
    } catch (err) {
      console.error('Login failed:', err)
      return false
    }
  }

  const logout = () => {
    setToken(null)
  }

  return (
    <AuthContext.Provider
      value={{ token, isAuthenticated, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
