import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import { useWebSocket } from './useWebSocket'
import type { DeviceNetworkMetric } from '../types'

export interface LiveNetworkMetrics {
  rx_bytes_per_sec: number
  tx_bytes_per_sec: number
  packets_recv_per_sec: number
  packets_sent_per_sec: number
  rtt_ms: number
  timestamp: number
}

export function useNetworkMetrics(serviceId?: string) {
  const [history, setHistory] = useState<DeviceNetworkMetric[]>([])
  const [latestMetrics, setLatestMetrics] = useState<LiveNetworkMetrics | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    if (!serviceId) return
    setLoading(true)
    try {
      const res = await api.getDeviceNetworkMetrics(serviceId, 50)
      const list = Array.isArray(res.metrics) ? res.metrics : []
      // Ordenar de más antiguo a más reciente para graficar
      const sorted = [...list].sort(
        (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      )
      setHistory(sorted)

      if (sorted.length > 0) {
        const last = sorted[sorted.length - 1]
        setLatestMetrics({
          rx_bytes_per_sec: last.rx_bytes_per_sec,
          tx_bytes_per_sec: last.tx_bytes_per_sec,
          packets_recv_per_sec: last.packets_recv_per_sec,
          packets_sent_per_sec: last.packets_sent_per_sec,
          rtt_ms: last.rtt_ms,
          timestamp: Math.floor(new Date(last.recorded_at).getTime() / 1000),
        })
      }
      setError(null)
    } catch (err: any) {
      setError(err?.message || 'Failed to load network metrics')
    } finally {
      setLoading(false)
    }
  }, [serviceId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Escuchar mensajes WebSocket para actualización reactiva en tiempo real sin polling
  useWebSocket({
    room: serviceId ? `device:${serviceId}` : undefined,
    onMessage: (message) => {
      if (!serviceId) return

      const payload = message.payload
      if (!payload || (payload.service_id !== serviceId && payload.device_id !== serviceId)) {
        return
      }

      const hostMetrics = payload.host_metrics
      const netMetrics = payload.network_metrics || hostMetrics

      if (netMetrics && (typeof netMetrics.rx_bytes_per_sec === 'number' || typeof netMetrics.rtt_ms === 'number')) {
        const rx = netMetrics.rx_bytes_per_sec || 0
        const tx = netMetrics.tx_bytes_per_sec || 0
        const pktRecv = netMetrics.packets_recv_per_sec || 0
        const pktSent = netMetrics.packets_sent_per_sec || 0
        const rtt = netMetrics.rtt_ms || 0
        const ts = payload.timestamp || Math.floor(Date.now() / 1000)
        const recordedAt = new Date(ts * 1000).toISOString()

        const newSample: DeviceNetworkMetric = {
          id: `ws-${ts}`,
          device_id: serviceId,
          rx_bytes_per_sec: rx,
          tx_bytes_per_sec: tx,
          packets_recv_per_sec: pktRecv,
          packets_sent_per_sec: pktSent,
          rtt_ms: rtt,
          recorded_at: recordedAt,
        }

        setLatestMetrics({
          rx_bytes_per_sec: rx,
          tx_bytes_per_sec: tx,
          packets_recv_per_sec: pktRecv,
          packets_sent_per_sec: pktSent,
          rtt_ms: rtt,
          timestamp: ts,
        })

        setHistory((prev) => {
          // Filtrar duplicados en el mismo segundo y mantener ventana deslizante de 50 muestras
          const filtered = prev.filter((s) => new Date(s.recorded_at).getTime() !== ts * 1000)
          const updated = [...filtered, newSample].sort(
            (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
          )
          return updated.slice(-50)
        })
      }
    },
  })

  return {
    history,
    latestMetrics,
    loading,
    error,
    refresh: fetchHistory,
  }
}
