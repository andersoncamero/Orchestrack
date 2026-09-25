import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface User {
  email: string
}

interface AuthContextValue {
  token: string
  user: User | null
  isLoading: boolean
  login: (token: string, user?: User) => void
  logout: () => void
}

const TOKEN_KEY = 'orchestrack-token'
const USER_KEY = 'orchestrack-user'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface JwtPayload {
  email?: string
  exp?: number
}

function parseJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token)
  if (!payload || !payload.exp) {
    return false
  }
  return Date.now() >= payload.exp * 1000
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string>('')
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
    setToken('')
    navigate('/login')
  }

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    if (storedToken) {
      if (isTokenExpired(storedToken)) {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      } else {
        try {
          setToken(storedToken)
          const storedUser = localStorage.getItem(USER_KEY)
          if (storedUser) {
            setUser(JSON.parse(storedUser))
          } else {
            const payload = parseJwt(storedToken)
            if (payload && payload.email) {
              setUser({ email: payload.email })
            }
          }
        } catch {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_KEY)
        }
      }
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!token) return
    const payload = parseJwt(token)
    if (!payload || !payload.exp) return
    const timeUntilExpiry = payload.exp * 1000 - Date.now()
    if (timeUntilExpiry <= 0) {
      logout()
      return
    }
    const timer = setTimeout(() => {
      logout()
    }, timeUntilExpiry)
    return () => clearTimeout(timer)
  }, [token])

  useEffect(() => {
    const handleUnauthorized = () => {
      logout()
    }
    window.addEventListener('orchestrack:unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('orchestrack:unauthorized', handleUnauthorized)
    }
  }, [])

  const login = (newToken: string, newUser?: User) => {
    localStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken)

    let resolvedUser: User | null = newUser || null
    if (!resolvedUser) {
      const payload = parseJwt(newToken)
      if (payload && payload.email) {
        resolvedUser = { email: payload.email }
      }
    }

    if (resolvedUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(resolvedUser))
      setUser(resolvedUser)
    }

    navigate('/dashboard')
  }

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function getToken(): string | null {
  const storedToken = localStorage.getItem(TOKEN_KEY)
  if (!storedToken) return null
  if (isTokenExpired(storedToken)) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    return null
  }
  return storedToken
}

