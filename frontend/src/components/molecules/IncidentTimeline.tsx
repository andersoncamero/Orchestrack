import { useMemo } from 'react'
import { Clock, ChevronRight } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { timeAgo } from '../../utils/time'
import type { IncidentEvent } from '../../types'

interface IncidentTimelineProps {
  events: IncidentEvent[]
}

const eventTypeStyles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  'host.cpu.high': { bg: 'bg-(--color-status-exited-subtle)', border: 'border-(--color-status-exited)/30', text: 'text-(--color-status-exited)', icon: 'text-(--color-status-exited)' },
  'host.memory.high': { bg: 'bg-(--color-status-exited-subtle)', border: 'border-(--color-status-exited)/30', text: 'text-(--color-status-exited)', icon: 'text-(--color-status-exited)' },
  'host.disk.high': { bg: 'bg-(--color-status-exited-subtle)', border: 'border-(--color-status-exited)/30', text: 'text-(--color-status-exited)', icon: 'text-(--color-status-exited)' },
  'host.offline': { bg: 'bg-(--color-status-exited-subtle)', border: 'border-(--color-status-exited)/30', text: 'text-(--color-status-exited)', icon: 'text-(--color-status-exited)' },
  'container.die': { bg: 'bg-(--color-status-warning-subtle)', border: 'border-(--color-status-warning)/30', text: 'text-(--color-status-warning)', icon: 'text-(--color-status-warning)' },
  'container.oom': { bg: 'bg-(--color-status-exited-subtle)', border: 'border-(--color-status-exited)/30', text: 'text-(--color-status-exited)', icon: 'text-(--color-status-exited)' },
  'container.kill': { bg: 'bg-(--color-status-warning-subtle)', border: 'border-(--color-status-warning)/30', text: 'text-(--color-status-warning)', icon: 'text-(--color-status-warning)' },
  default: { bg: 'bg-(--color-bg-surface)', border: 'border-(--color-border)', text: 'text-(--color-text-main)', icon: 'text-(--color-primary)' },
}

function getEventStyles(eventType: string) {
  return eventTypeStyles[eventType] || eventTypeStyles.default
}

function formatEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    'host.cpu.high': 'CPU Crítica',
    'host.memory.high': 'Memoria Crítica',
    'host.disk.high': 'Disco Crítico',
    'host.offline': 'Host Offline',
    'container.die': 'Contenedor Caído',
    'container.oom': 'OOM Kill',
    'container.kill': 'Contenedor Matado',
  }
  return labels[eventType] || eventType
}

export function IncidentTimeline({ events }: IncidentTimelineProps) {
  const { t } = useLanguage()

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      // Primero por sequence_order, luego por created_at
      if (a.sequence_order !== b.sequence_order) {
        return a.sequence_order - b.sequence_order
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
  }, [events])

  if (sortedEvents.length === 0) {
    return (
      <div className="text-(--color-text-muted) text-sm py-4 text-center">
        {t('noTimelineEvents')}
      </div>
    )
  }

  return (
    <div className="relative pl-6">
      {/* Línea vertical central */}
      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-(--color-border-strong)" />

      <div className="space-y-4">
        {sortedEvents.map((event, index) => {
          const styles = getEventStyles(event.event_type)
          const isLast = index === sortedEvents.length - 1

          return (
            <div key={event.id} className="relative flex items-start gap-3">
              {/* Punto en la línea */}
              <div
                className={`absolute left-[-17px] top-1.5 w-3 h-3 rounded-full border-2 border-(--color-bg-surface) ${
                  isLast ? 'bg-(--color-status-exited)' : 'bg-(--color-primary)'
                }`}
              />

              {/* Tarjeta del evento */}
              <div
                className={`flex-1 rounded-lg border ${styles.border} ${styles.bg} p-3`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <ChevronRight className={`w-4 h-4 ${styles.icon}`} />
                    <span className={`text-sm font-semibold ${styles.text}`}>
                      {formatEventLabel(event.event_type)}
                    </span>
                  </div>
                  <span className="text-xs text-(--color-text-muted)">
                    #{event.sequence_order}
                  </span>
                </div>

                {event.container_name && (
                  <p className="text-xs text-(--color-text-muted) mb-1">
                    Container: <span className="font-mono">{event.container_name}</span>
                  </p>
                )}

                <div className="flex items-center gap-1.5 mt-2">
                  <Clock className="w-3 h-3 text-(--color-text-muted)" />
                  <span className="text-xs text-(--color-text-muted)">
                    {timeAgo(new Date(event.created_at).getTime() / 1000)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
