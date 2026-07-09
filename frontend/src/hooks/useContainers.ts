import { useEffect, useState, useRef } from 'react'
import { api } from '../services/api'
import type { ContainerSummary } from '../types'

export function useContainers(identifier: string, all = true) {
  const [containers, setContainers] = useState<ContainerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Trackear la última petición para evitar fetches redundantes casi simultáneos (e.g. React StrictMode)
  const lastRequestRef = useRef<{ identifier: string; all: boolean; timestamp: number } | null>(null)

  const fetchContainers = async (silent = false) => {
    if (!identifier) {
      setLoading(false)
      return
    }

    const now = Date.now()
    if (
      lastRequestRef.current &&
      lastRequestRef.current.identifier === identifier &&
      lastRequestRef.current.all === all &&
      now - lastRequestRef.current.timestamp < 300
    ) {
      return
    }
    
    lastRequestRef.current = { identifier, all, timestamp: now }

    if (!silent) setLoading(true)
    try {
      const data = await api.getContainers(identifier, all)
      setContainers(data.containers)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch containers')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchContainers()
  }, [identifier, all])

  return { containers, loading, error, refetch: fetchContainers }
}
