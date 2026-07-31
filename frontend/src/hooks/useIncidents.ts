import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import { useWebSocketContext } from '../contexts/WebSocketContext'
import type { Incident, IncidentEvent } from '../types'

interface UseIncidentsOptions {
  deviceId?: string
  status?: string
  limit?: number
}

export function useIncidents({ deviceId, status, limit = 50 }: UseIncidentsOptions = {}) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { subscribe } = useWebSocketContext()

  const fetchIncidents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getIncidents(deviceId, status, limit)
      setIncidents(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch incidents')
    } finally {
      setLoading(false)
    }
  }, [deviceId, status, limit])

  useEffect(() => {
    fetchIncidents()
  }, [fetchIncidents])

  // WebSocket: escuchar eventos de incidentes para el dispositivo
  useEffect(() => {
    const room = deviceId ? `device:${deviceId}` : 'dashboard'

    const handleWsMessage = (msg: any) => {
      const eventType = msg?.type
      if (
        eventType === 'incident.created' ||
        eventType === 'incident.updated' ||
        eventType === 'incident.resolved'
      ) {
        // Refrescar lista de incidentes cuando llegue un evento relevante
        fetchIncidents()
      }
    }

    const unsubscribe = subscribe(room, handleWsMessage)
    return () => unsubscribe()
  }, [subscribe, deviceId, fetchIncidents])

  const getIncidentTimeline = useCallback(async (incidentId: string): Promise<IncidentEvent[]> => {
    try {
      const res = await api.getIncidentTimeline(incidentId)
      return res.timeline || []
    } catch (err: any) {
      throw new Error(err.message || 'Failed to fetch incident timeline')
    }
  }, [])

  const getIncidentById = useCallback(async (incidentId: string): Promise<Incident> => {
    try {
      return await api.getIncidentByID(incidentId)
    } catch (err: any) {
      throw new Error(err.message || 'Failed to fetch incident')
    }
  }, [])

  return {
    incidents,
    loading,
    error,
    refetch: fetchIncidents,
    getIncidentTimeline,
    getIncidentById,
  }
}
