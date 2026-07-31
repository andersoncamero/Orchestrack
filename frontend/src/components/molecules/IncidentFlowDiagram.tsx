import { useMemo } from 'react'
import { Zap, ArrowRight, AlertTriangle, Box } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import type { Incident, IncidentEvent } from '../../types'

interface IncidentFlowDiagramProps {
  incident: Incident
  events: IncidentEvent[]
}

interface FlowNode {
  id: string
  label: string
  sublabel?: string
  icon: React.ElementType
  color: string
  bg: string
  border: string
}

export function IncidentFlowDiagram({ incident, events }: IncidentFlowDiagramProps) {
  const { t } = useLanguage()

  const nodes = useMemo<FlowNode[]>(() => {
    const result: FlowNode[] = []

    // Nodo origen (causa raíz)
    const isCritical = incident.severity === 'critical'
    result.push({
      id: 'origin',
      label: t('origin'),
      sublabel: incident.root_cause_type,
      icon: Zap,
      color: isCritical ? 'text-(--color-status-exited)' : 'text-(--color-status-warning)',
      bg: isCritical ? 'bg-(--color-status-exited-subtle)' : 'bg-(--color-status-warning-subtle)',
      border: isCritical ? 'border-(--color-status-exited)/40' : 'border-(--color-status-warning)/40',
    })

    // Nodos de propagación (eventos intermedios)
    const propagationEvents = events.filter(
      (e) => e.event_type !== incident.root_cause_type && e.sequence_order > 0
    )

    if (propagationEvents.length > 0) {
      result.push({
        id: 'propagation',
        label: t('propagation'),
        sublabel: `${propagationEvents.length} ${t('events').toLowerCase()}`,
        icon: Box,
        color: 'text-(--color-status-warning)',
        bg: 'bg-(--color-status-warning-subtle)',
        border: 'border-(--color-status-warning)/40',
      })
    }

    // Nodo impacto final
    result.push({
      id: 'impact',
      label: t('impact'),
      sublabel: incident.title,
      icon: AlertTriangle,
      color: 'text-(--color-status-exited)',
      bg: 'bg-(--color-status-exited-subtle)',
      border: 'border-(--color-status-exited)/40',
    })

    return result
  }, [incident, events, t])

  if (nodes.length === 0) return null

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max px-2 py-4">
        {nodes.map((node, index) => (
          <div key={node.id} className="flex items-center gap-2">
            {/* Tarjeta */}
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${node.border} ${node.bg} min-w-[160px]`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-(--color-bg-surface) border border-(--color-border)`}>
                <node.icon className={`w-5 h-5 ${node.color}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-bold ${node.color}`}>{node.label}</p>
                {node.sublabel && (
                  <p className="text-xs text-(--color-text-muted) truncate max-w-[140px]">
                    {node.sublabel}
                  </p>
                )}
              </div>
            </div>

            {/* Flecha conectora */}
            {index < nodes.length - 1 && (
              <ArrowRight className="w-5 h-5 text-(--color-border-strong) shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
