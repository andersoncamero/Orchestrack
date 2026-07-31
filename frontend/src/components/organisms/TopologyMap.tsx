import { useLanguage } from '../../contexts/LanguageContext'
import type { TopologyNode, TopologyEdge } from '../../hooks/useTopology'

interface TopologyMapProps {
  nodes: TopologyNode[]
  edges: TopologyEdge[]
  selectedNodeId: string | null
  onSelectNode: (id: string | null) => void
}

export function TopologyMap({ nodes, edges, selectedNodeId, onSelectNode }: TopologyMapProps) {
  const { t } = useLanguage()

  const svgWidth = 800
  const svgHeight = 600

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-(--color-text-muted) text-sm">
        {t('noInstances')}
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-(--color-bg-surface) rounded-xl border border-(--color-border) overflow-hidden">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-full"
        style={{ minHeight: '300px' }}
      >
        <defs>
          {/* Arrow marker */}
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="24" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 L2,4 Z" fill="var(--color-status-exited)" />
          </marker>
          <marker id="arrowNormal" markerWidth="8" markerHeight="8" refX="24" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 L2,4 Z" fill="var(--color-border-strong)" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((edge, index) => {
          const fromNode = nodes.find((n) => n.id === edge.from)
          const toNode = nodes.find((n) => n.id === edge.to)
          if (!fromNode || !toNode) return null

          const isProp = edge.isPropagation
          return (
            <g key={`edge-${index}`}>
              <line
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={isProp ? 'var(--color-status-exited)' : 'var(--color-border-strong)'}
                strokeWidth={isProp ? 2.5 : 1.5}
                strokeDasharray={isProp ? '6 4' : '0'}
                opacity={isProp ? 1 : 0.6}
                markerEnd={isProp ? 'url(#arrow)' : 'url(#arrowNormal)'}
              />
            </g>
          )
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const isSelected = selectedNodeId === node.id
          const statusColor =
            node.status === 'offline'
              ? 'var(--color-status-exited)'
              : node.isAffected
                ? 'var(--color-status-warning)'
                : 'var(--color-status-running)'

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              className="cursor-pointer"
              onClick={() => onSelectNode(isSelected ? null : node.id)}
              style={{ cursor: 'pointer' }}
            >
              {/* Selection ring */}
              {isSelected && (
                <circle r="29" stroke="var(--color-primary)" strokeWidth="1.5" fill="none" opacity="0.85" />
              )}

              {/* Node body */}
              <circle
                r="22"
                fill="var(--color-bg-surface)"
                stroke={statusColor}
                strokeWidth={node.isOrigin ? 3 : 2}
                className="transition-all duration-300"
              />

              {/* Vector Server Chassis Icon inside */}
              <g transform="translate(-10, -10)" opacity={node.status === 'offline' ? 0.35 : 0.8}>
                {/* Top server blade line */}
                <rect x="1" y="2" width="18" height="7" rx="1" fill="none" stroke="var(--color-text-main)" strokeWidth="1.5" />
                <circle cx="5" cy="5.5" r="0.75" fill="var(--color-text-main)" />
                <circle cx="8" cy="5.5" r="0.75" fill="var(--color-text-main)" />
                <line x1="12" y1="5.5" x2="16" y2="5.5" stroke="var(--color-text-main)" strokeWidth="1.5" strokeLinecap="round" />

                {/* Bottom server blade line */}
                <rect x="1" y="11" width="18" height="7" rx="1" fill="none" stroke="var(--color-text-main)" strokeWidth="1.5" />
                <circle cx="5" cy="14.5" r="0.75" fill="var(--color-text-main)" />
                <circle cx="8" cy="14.5" r="0.75" fill="var(--color-text-main)" />
                <line x1="12" y1="14.5" x2="16" y2="14.5" stroke="var(--color-text-main)" strokeWidth="1.5" strokeLinecap="round" />
              </g>

              {/* Status dot */}
              <circle
                cx="14"
                cy="-14"
                r="6"
                fill={statusColor}
                stroke="var(--color-bg-surface)"
                strokeWidth="2"
              />

              {/* Label */}
              <text
                y="38"
                textAnchor="middle"
                fill="var(--color-text-main)"
                fontSize="11"
                fontWeight="600"
                className="select-none"
              >
                {node.hostname}
              </text>

              {/* ID label */}
              <text
                y="50"
                textAnchor="middle"
                fill="var(--color-text-muted)"
                fontSize="9"
                fontFamily="monospace"
                className="select-none"
              >
                {node.id.slice(0, 8)}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Legend overlay */}
      <div className="absolute bottom-4 left-4 bg-(--color-bg-surface)/95 backdrop-blur-sm border border-(--color-border) rounded-xl px-4 py-3 space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-(--color-status-running)" />
          <span className="text-(--color-text-muted)">{t('healthy')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-(--color-status-warning)" />
          <span className="text-(--color-text-muted)">{t('degraded')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-(--color-status-exited)" />
          <span className="text-(--color-text-muted)">{t('down')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-(--color-status-exited)" />
          <span className="text-(--color-text-muted)">{t('propagationRoute')}</span>
        </div>
      </div>
    </div>
  )
}
