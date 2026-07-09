import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { ConnectionHistorySample, DeviceConnectionEvent } from '../types'

export function useConnectionHistory(hours = 24, serviceId?: string) {
  const [samples, setSamples] = useState<ConnectionHistorySample[]>([])
  const [events, setEvents] = useState<DeviceConnectionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      if (serviceId) {
        const data = await api.getDeviceConnectionHistory(serviceId, hours)
        setSamples(data.samples)
        setEvents(data.events || [])
      } else {
        const data = await api.getConnectionHistory(hours)
        setSamples(data.samples)
        setEvents([])
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch connection history')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [hours, serviceId])

  return { samples, events, loading, error, refetch: fetchHistory }
}
