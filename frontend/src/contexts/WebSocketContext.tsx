import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'

type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error'

interface WebSocketContextValue {
  status: WebSocketStatus
  subscribe: (room: string, callback: (payload: any) => void) => () => void
  sendMessage: (message: any) => void
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [status, setStatus] = useState<WebSocketStatus>('closed')
  const wsRef = useRef<WebSocket | null>(null)
  
  // Mapa de salas -> Set de callbacks
  const listenersRef = useRef<Map<string, Set<(payload: any) => void>>>(new Map())
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sendControlAction = (action: 'join' | 'leave', room: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, room }))
    }
  }

  const connect = () => {
    if (!token) {
      cleanup()
      return
    }

    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return
    }

    setStatus('connecting')
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/^http/, 'ws') + '/api/v1/ws'
    const separator = baseUrl.includes('?') ? '&' : '?'
    
    // Al conectar inicialmente, nos suscribimos a las salas que ya tienen oyentes activos
    const activeRooms = Array.from(listenersRef.current.keys()).filter(room => listenersRef.current.get(room)!.size > 0)
    const roomsQuery = activeRooms.length > 0 ? `&rooms=${activeRooms.join(',')}` : ''
    
    const wsUrl = `${baseUrl}${separator}token=${encodeURIComponent(token)}${roomsQuery}`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('open')
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      
      // Volver a suscribirse a todas las salas activas tras reconexión
      activeRooms.forEach(room => {
        sendControlAction('join', room)
      })
    }

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data)
        const eventType = parsed.type

        // Mapeamos el tipo de evento a la sala lógica:
        // - Eventos de tipo "heartbeat" pertenecen a la sala "dashboard"
        // - Eventos de tipo "container.*" pertenecen a la sala "containers"
        let targetRoom = ''
        if (eventType === 'heartbeat' || (eventType && (eventType.startsWith('instance.') || eventType.startsWith('device.') || eventType.startsWith('image.')))) {
          targetRoom = 'dashboard'
        } else if (eventType && eventType.startsWith('container.')) {
          targetRoom = 'containers'
        }

        if (targetRoom) {
          const roomCallbacks = listenersRef.current.get(targetRoom)
          if (roomCallbacks) {
            // Pasamos el mensaje completo { type, payload } para mantener compatibilidad
            roomCallbacks.forEach((cb) => cb(parsed))
          }
        }

        // Además, si es un evento de contenedor y tiene service_id, despachar a la sala segmentada
        if (eventType && eventType.startsWith('container.') && parsed.payload?.service_id) {
          const specificRoom = `containers:${parsed.payload.service_id}`
          const specificCallbacks = listenersRef.current.get(specificRoom)
          if (specificCallbacks) {
            specificCallbacks.forEach((cb) => cb(parsed))
          }
        }
      } catch (err) {
        console.error('Error parsing WS message:', err)
      }
    }

    ws.onerror = () => {
      setStatus('error')
    }

    ws.onclose = () => {
      setStatus('closed')
      wsRef.current = null
      
      // Reconexión automática
      if (token) {
        reconnectTimerRef.current = setTimeout(() => {
          connect()
        }, 3000)
      }
    }
  }

  const cleanup = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setStatus('closed')
  }

  useEffect(() => {
    connect()
    return () => cleanup()
  }, [token])

  // Método de suscripción
  const subscribe = (room: string, callback: (payload: any) => void) => {
    if (!listenersRef.current.has(room)) {
      listenersRef.current.set(room, new Set())
    }
    
    const callbacks = listenersRef.current.get(room)!
    const isFirstSubscriber = callbacks.size === 0
    callbacks.add(callback)

    // Si es el primer componente en suscribirse a esta sala, notificamos al backend
    if (isFirstSubscriber) {
      sendControlAction('join', room)
    }

    // Retornamos función de des-suscripción
    return () => {
      const currentCallbacks = listenersRef.current.get(room)
      if (currentCallbacks) {
        currentCallbacks.delete(callback)
        // Si ya no quedan suscriptores, notificamos al backend que salimos de la sala
        if (currentCallbacks.size === 0) {
          sendControlAction('leave', room)
          listenersRef.current.delete(room)
        }
      }
    }
  }

  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof message === 'string' ? message : JSON.stringify(message))
    }
  }

  return (
    <WebSocketContext.Provider value={{ status, subscribe, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocketContext() {
  const ctx = useContext(WebSocketContext)
  if (!ctx) throw new Error('useWebSocketContext must be used within WebSocketProvider')
  return ctx
}
