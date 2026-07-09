import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'
import { useWebSocket } from './useWebSocket'
import type { Instance } from '../types'

export function useInstances() {
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInstances = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await api.getInstances()
      setInstances(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch instances')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInstances()
  }, [fetchInstances])

  // Actualización reactiva por WebSocket en tiempo real
  useWebSocket({
    room: 'dashboard',
    onMessage: useCallback((message: any) => {
      if (message.type === 'heartbeat') {
        setInstances((prev) =>
          prev.map((inst) =>
            inst.service_id === message.payload.service_id
              ? {
                  ...inst,
                  status: 'online',
                  last_seen: message.payload.last_seen || inst.last_seen,
                  host_metrics: message.payload.host_metrics || inst.host_metrics,
                }
              : inst
          )
        )
      } else if (message.type === 'instance.offline' || message.type === 'instance.online') {
        setInstances((prev) =>
          prev.map((inst) =>
            inst.service_id === message.payload.service_id
              ? {
                  ...inst,
                  status: message.type === 'instance.online' ? 'online' : 'offline',
                  last_seen: message.payload.last_seen || inst.last_seen,
                }
              : inst
          )
        )
      }
    }, []),
  })

  return { instances, loading, error, refetch: fetchInstances }
}
