import { useState, useEffect, useCallback } from 'react'
import { useWebSocketContext } from '../contexts/WebSocketContext'

interface AffectedNode {
  device_id: string
  hostname: string
  status: string
  is_origin: boolean
}

interface MultiHostPropagationData {
  incident_id: string
  affected_servers: AffectedNode[]
  affected_count: number
  total_devices: number
  infrastructure_affected: number
  timestamp: number
}

export function useMultiHostPropagation() {
  const { subscribe } = useWebSocketContext()
  const [propagation, setPropagation] = useState<MultiHostPropagationData | null>(null)

  const handleMessage = useCallback((msg: any) => {
    if (msg?.type === 'multi_host_propagation_updated') {
      const payload = msg
      setPropagation({
        incident_id: payload.incident_id,
        affected_servers: Array.isArray(payload.affected_servers) ? payload.affected_servers : [],
        affected_count: payload.affected_count ?? 0,
        total_devices: payload.total_devices ?? 0,
        infrastructure_affected: payload.infrastructure_affected ?? 0,
        timestamp: payload.timestamp ?? Date.now() / 1000,
      })
    }
  }, [])

  useEffect(() => {
    const unsubscribe = subscribe('dashboard', handleMessage)
    return () => unsubscribe()
  }, [subscribe, handleMessage])

  const clearPropagation = useCallback(() => {
    setPropagation(null)
  }, [])

  return { propagation, clearPropagation }
}
