import { useEffect } from 'react'
import { useWebSocketContext } from '../contexts/WebSocketContext'

interface UseWebSocketOptions {
  url?: string
  onMessage?: (data: any) => void
  room?: string
}

export function useWebSocket({
  onMessage,
  room = 'containers',
}: UseWebSocketOptions) {
  const { status, sendMessage, subscribe } = useWebSocketContext()

  useEffect(() => {
    if (!onMessage) return
    const unsubscribe = subscribe(room, onMessage)
    return () => unsubscribe()
  }, [subscribe, onMessage, room])

  return {
    status,
    sendMessage,
    close: () => {}, // Mock close for backwards compatibility
  }
}

