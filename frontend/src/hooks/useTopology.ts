import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import { useWebSocketContext } from '../contexts/WebSocketContext'
import type { Instance, ServerDependency } from '../types'

export interface TopologyNode {
  id: string
  hostname: string
  status: 'online' | 'offline' | 'pending'
  x: number
  y: number
  isOrigin: boolean
  isAffected: boolean
  metrics?: Instance['host_metrics']
  totalContainers?: number
  runningContainers?: number
}

export interface TopologyEdge {
  from: string
  to: string
  type: string
  isPropagation: boolean
}

export function useTopology(instances: Instance[]) {
  const { subscribe } = useWebSocketContext()
  const [nodes, setNodes] = useState<TopologyNode[]>([])
  const [edges, setEdges] = useState<TopologyEdge[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const [topologyDeps, setTopologyDeps] = useState<ServerDependency[]>([])

  const fetchTopology = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getTopology()
      setTopologyDeps(data.topology || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch topology')
      setTopologyDeps([])
    } finally {
      setLoading(false)
    }
  }, [])

  const buildGraph = useCallback((insts: Instance[], deps: ServerDependency[]) => {
    // Build nodes from instances
    const nodeMap = new Map<string, TopologyNode>()
    const centerX = 400
    const centerY = 300
    const radius = 220

    insts.forEach((inst, index) => {
      const angle = (2 * Math.PI * index) / Math.max(insts.length, 1) - Math.PI / 2
      nodeMap.set(inst.service_id, {
        id: inst.service_id,
        hostname: inst.hostname,
        status: inst.status,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        isOrigin: false,
        isAffected: inst.status === 'offline',
        metrics: inst.host_metrics,
        totalContainers: inst.total_containers,
        runningContainers: inst.running_containers,
      })
    })

    // Build edges from dependencies
    const edgeList: TopologyEdge[] = []
    deps.forEach((dep) => {
      if (nodeMap.has(dep.source_device_id) && nodeMap.has(dep.target_device_id)) {
        edgeList.push({
          from: dep.source_device_id,
          to: dep.target_device_id,
          type: dep.dependency_type,
          isPropagation: dep.dependency_type === 'cascade',
        })
      }
    })

    // If no dependencies, create a ring fallback
    if (edgeList.length === 0 && insts.length > 1) {
      for (let i = 0; i < insts.length; i++) {
        const next = (i + 1) % insts.length
        edgeList.push({
          from: insts[i].service_id,
          to: insts[next].service_id,
          type: 'network',
          isPropagation: false,
        })
      }
    }

    setNodes(Array.from(nodeMap.values()))
    setEdges(edgeList)
  }, [])

  // Reconstruir grafo cuando cambian instancias o dependencias de topología
  useEffect(() => {
    buildGraph(instances, topologyDeps)
  }, [instances, topologyDeps, buildGraph])

  // Fetch inicial de topología solo al montar
  useEffect(() => {
    fetchTopology()
  }, [])

  // WebSocket: update affected status in real time
  useEffect(() => {
    const handleWsMessage = (msg: any) => {
      if (msg?.type === 'multi_host_propagation_updated') {
        const affectedServers = msg?.affected_servers || []
        setNodes((prev) =>
          prev.map((node) => {
            const affected = affectedServers.find((s: any) => s.device_id === node.id)
            if (affected) {
              return { ...node, isAffected: true, isOrigin: affected.is_origin }
            }
            return node
          })
        )
      } else if (msg?.type === 'heartbeat') {
        const serviceId = msg?.payload?.service_id
        if (serviceId) {
          setNodes((prev) =>
            prev.map((node) => {
              if (node.id === serviceId) {
                return {
                  ...node,
                  status: 'online',
                  metrics: msg.payload?.host_metrics || node.metrics,
                }
              }
              return node
            })
          )
        }
      }
    }

    const unsubscribe = subscribe('dashboard', handleWsMessage)
    return () => unsubscribe()
  }, [subscribe])

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null

  return {
    nodes,
    edges,
    loading,
    error,
    selectedNode,
    selectedNodeId,
    setSelectedNodeId,
    refetch: fetchTopology,
  }
}
