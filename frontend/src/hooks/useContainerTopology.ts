import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import { useWebSocketContext } from '../contexts/WebSocketContext'
import type { ContainerNetworkLink } from '../types'

interface UseContainerTopologyOptions {
  identifier?: string
}

export function useContainerTopology({ identifier }: UseContainerTopologyOptions = {}) {
  const [links, setLinks] = useState<ContainerNetworkLink[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { subscribe } = useWebSocketContext()

  const fetchData = useCallback(async () => {
    if (!identifier) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.getContainerTopology(identifier)
      setLinks(res.links || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch container topology')
    } finally {
      setLoading(false)
    }
  }, [identifier])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // WebSocket: refrescar cuando un contenedor cambia de estado en esta instancia.
  useEffect(() => {
    const room = identifier ? `device:${identifier}` : 'dashboard'

    const handleWsMessage = (msg: any) => {
      const eventType = msg?.type
      if (
        eventType === 'container_started' ||
        eventType === 'container_stopped' ||
        eventType === 'container_created' ||
        eventType === 'container_removed' ||
        eventType === 'container_restarted' ||
        eventType === 'container_renamed'
      ) {
        fetchData()
      }
    }

    const unsubscribe = subscribe(room, handleWsMessage)
    return () => unsubscribe()
  }, [subscribe, identifier, fetchData])

  return {
    links,
    loading,
    error,
    refetch: fetchData,
  }
}
