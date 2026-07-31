import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import { useWebSocketContext } from '../contexts/WebSocketContext'
import type { IncidentTransactionsResponse, AffectedTransaction, ServerTransactionImpact } from '../types'

interface UseAffectedTransactionsOptions {
  incidentId?: string
  deviceId?: string
}

export function useAffectedTransactions({ incidentId, deviceId }: UseAffectedTransactionsOptions = {}) {
  const [transactions, setTransactions] = useState<AffectedTransaction[]>([])
  const [serverTransactions, setServerTransactions] = useState<ServerTransactionImpact[]>([])
  const [categoryGroups, setCategoryGroups] = useState<IncidentTransactionsResponse['categories']>([])
  const [totalFailed, setTotalFailed] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { subscribe } = useWebSocketContext()

  const fetchData = useCallback(async () => {
    if (!incidentId) return
    setLoading(true)
    setError(null)
    try {
      const [txRes, srvRes] = await Promise.all([
        api.getIncidentTransactions(incidentId),
        api.getIncidentServerTransactions(incidentId),
      ])
      setTransactions(txRes.transactions || [])
      setCategoryGroups(txRes.categories || [])
      setTotalFailed(txRes.total_failed || 0)
      setServerTransactions(srvRes.records || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch affected transactions')
    } finally {
      setLoading(false)
    }
  }, [incidentId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // WebSocket: escuchar eventos de transacciones degradadas
  useEffect(() => {
    const room = deviceId ? `device:${deviceId}` : 'dashboard'

    const handleWsMessage = (msg: any) => {
      const eventType = msg?.type
      if (eventType === 'server_transaction_degraded') {
        // Si el mensaje corresponde al incidente o dispositivo actual, refrescar
        const msgIncidentId = msg?.incident_id
        const msgDeviceId = msg?.device_id
        if (
          (incidentId && msgIncidentId === incidentId) ||
          (deviceId && msgDeviceId === deviceId)
        ) {
          fetchData()
        }
      }
    }

    const unsubscribe = subscribe(room, handleWsMessage)
    return () => unsubscribe()
  }, [subscribe, deviceId, incidentId, fetchData])

  return {
    transactions,
    serverTransactions,
    categoryGroups,
    totalFailed,
    loading,
    error,
    refetch: fetchData,
  }
}
