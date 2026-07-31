import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Network, RefreshCw } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { Spinner } from '../atoms/Spinner'
import type { ContainerNetworkLink } from '../../types'

interface ContainerTopologyPanelProps {
  links?: ContainerNetworkLink[]
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
  className?: string
}

interface GraphNode {
  id: string
  name: string
  x: number
  y: number
}

interface GraphEdge {
  source: string
  target: string
  network: string
  type: string
}

const NODE_RADIUS = 22

export function ContainerTopologyPanel({
  links = [],
  loading,
  error,
  onRefresh,
  className = '',
}: ContainerTopologyPanelProps) {
  const { t } = useLanguage()
  const graphRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ width: number; height: number }>(() => ({
    width: 600,
    height: 420,
  }))

  useEffect(() => {
    const el = graphRef.current
    if (!el) return

    const update = () => {
      const rect = el.getBoundingClientRect()
      const w = rect.width || el.clientWidth || 600
      const h = rect.height || el.clientHeight || 420
      if (w > 0 && h > 0) {
        setSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }))
      }
    }

    update()
    const rafId = requestAnimationFrame(update)

    const observer = new ResizeObserver(() => {
      update()
    })
    observer.observe(el)

    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [])

  const { nodes, edges, networks } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>()
    const networkSet = new Set<string>()

    for (const link of links) {
      const sourceId = link.source_container_id
      const targetId = link.target_container_id
      networkSet.add(link.network)
      for (const id of [sourceId, targetId]) {
        if (!nodeMap.has(id)) {
          const name = id === sourceId ? link.source_container_name : link.target_container_name
          nodeMap.set(id, { id, name: name || id.slice(0, 12), x: 0, y: 0 })
        }
      }
    }

    const nodeList = Array.from(nodeMap.values())
    const count = nodeList.length
    const radius = Math.max(Math.min(size.width, size.height) / 2 - NODE_RADIUS - 40, 40)
    nodeList.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / Math.max(count, 1) - Math.PI / 2
      node.x = Math.round(size.width / 2 + radius * Math.cos(angle))
      node.y = Math.round(size.height / 2 + radius * Math.sin(angle))
    })

    const edgeList: GraphEdge[] = []
    const seenEdges = new Set<string>()

    for (const net of networkSet) {
      const netContainerIDs = new Set<string>()
      const linkTypeMap = new Map<string, string>()

      for (const link of links) {
        if (link.network === net) {
          netContainerIDs.add(link.source_container_id)
          netContainerIDs.add(link.target_container_id)

          const k1 = `${link.source_container_id}|${link.target_container_id}`
          const k2 = `${link.target_container_id}|${link.source_container_id}`
          linkTypeMap.set(k1, link.type)
          linkTypeMap.set(k2, link.type)
        }
      }

      // Ordenar contenedores según su posición circular para evitar cruces
      const containersInNet = Array.from(netContainerIDs).sort((a, b) => {
        return nodeList.findIndex(n => n.id === a) - nodeList.findIndex(n => n.id === b)
      })

      const N = containersInNet.length
      if (N > 1) {
        for (let i = 0; i < N; i++) {
          const u = containersInNet[i]
          const v = containersInNet[(i + 1) % N]

          const pairKey = u < v ? `${u}|${v}|${net}` : `${v}|${u}|${net}`
          if (!seenEdges.has(pairKey)) {
            seenEdges.add(pairKey)

            const linkType = linkTypeMap.get(`${u}|${v}`) || 'network_shared'
            edgeList.push({
              source: u,
              target: v,
              network: net,
              type: linkType,
            })
          }
        }
      }
    }

    return { nodes: nodeList, edges: edgeList, networks: Array.from(networkSet) }
  }, [links, size])

  if (loading) {
    return (
      <div className={`bg-(--color-bg-base) border border-(--color-border) rounded-xl p-8 flex items-center justify-center ${className}`}>
        <Spinner size="md" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-(--color-status-exited-subtle) border border-(--color-status-exited)/30 text-(--color-status-exited) px-4 py-3 rounded-xl text-sm ${className}`}>
        {error}
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className={`bg-(--color-bg-base) border border-(--color-border) rounded-xl p-6 text-center ${className}`}>
        <Box className="w-8 h-8 mx-auto mb-2 text-(--color-text-muted)" />
        <p className="text-(--color-text-muted) text-sm">{t('noContainerTopology')}</p>
      </div>
    )
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  return (
    <div className={`bg-(--color-bg-base) border border-(--color-border) rounded-xl overflow-hidden flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-(--color-border) flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Network className="w-4 h-4 text-(--color-primary) shrink-0" />
          <h3 className="text-sm font-bold text-(--color-text-main) uppercase tracking-wide truncate">
            {t('containerNetworkGraph')}
          </h3>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-(--color-text-muted)">
            {nodes.length} {t('containersConnected')} · {networks.length} {t('networksDetected')}
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg text-(--color-text-muted) hover:text-(--color-primary) hover:bg-(--color-primary-subtle) transition-colors"
              title={t('refreshTopology')}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Graph */}
      <div ref={graphRef} className="relative flex-1 min-h-[300px]">
        <svg className="absolute inset-0 w-full h-full">
            {/* Edges */}
            {edges.map((edge, i) => {
              const a = nodeById.get(edge.source)
              const b = nodeById.get(edge.target)
              if (!a || !b) return null
              const p = edgeEndpoints(a, b, NODE_RADIUS)
              const stroke = edge.type === 'compose_link' ? 'var(--color-status-warning)' : 'var(--color-status-running)'
              const midX = (p.x1 + p.x2) / 2
              const midY = (p.y1 + p.y2) / 2

              const dx = p.x2 - p.x1
              const dy = p.y2 - p.y1
              let angle = (Math.atan2(dy, dx) * 180) / Math.PI
              if (angle > 90 || angle < -90) {
                angle += 180
              }

              return (
                <g key={i}>
                  <line
                    x1={p.x1.toFixed(1)}
                    y1={p.y1.toFixed(1)}
                    x2={p.x2.toFixed(1)}
                    y2={p.y2.toFixed(1)}
                    stroke={stroke}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    opacity={0.9}
                  />
                  <text
                    x={midX}
                    y={midY - 6}
                    textAnchor="middle"
                    transform={`rotate(${angle.toFixed(1)}, ${midX.toFixed(1)}, ${midY.toFixed(1)})`}
                    className="fill-(--color-text-muted)"
                    fontSize="11"
                    fontWeight="500"
                    paintOrder="stroke"
                    stroke="var(--color-bg-base)"
                    strokeWidth={4}
                  >
                    {edge.network}
                  </text>
                </g>
              )
            })}

            {/* Nodes */}
            {nodes.map((node) => (
              <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                <circle
                  r="20"
                  fill="var(--color-bg-surface)"
                  stroke="var(--color-primary)"
                  strokeWidth="2"
                  className="transition-all duration-300"
                />
                <g transform="translate(-10, -10)" className="text-(--color-primary) opacity-90">
                  <Box width={20} height={20} />
                </g>
                <text
                  x={0}
                  y={32}
                  textAnchor="middle"
                  className="fill-(--color-text-main)"
                  fontSize="11"
                  fontWeight="600"
                >
                  {node.name}
                </text>
              </g>
            ))}
          </svg>
      </div>

      {/* Legend */}
      <div className="px-5 py-3 border-t border-(--color-border) flex flex-wrap items-center gap-4 text-xs text-(--color-text-muted)">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-dashed border-(--color-status-running)" />
          {t('networkShared')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-dashed border-(--color-status-warning)" />
          {t('composeLink')}
        </span>
        <span className="text-(--color-text-muted)/80">{t('containerNetworkDescription')}</span>
      </div>
    </div>
  )
}

function edgeEndpoints(a: GraphNode, b: GraphNode, radius: number) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dist = Math.hypot(dx, dy) || 0.001
  const ux = dx / dist
  const uy = dy / dist
  return {
    x1: a.x + ux * radius,
    y1: a.y + uy * radius,
    x2: b.x - ux * radius,
    y2: b.y - uy * radius,
  }
}
