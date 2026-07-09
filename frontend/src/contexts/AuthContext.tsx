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

function parseJwt(token: string): { email?: string } | null {
  try {
    const base64Url = token.split('.')[1]
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string>("")
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    if (storedToken) {
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
    setIsLoading(false)
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
    
    navigate('/')
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
    setToken("")
    navigate('/login')
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
  return localStorage.getItem(TOKEN_KEY)
}

