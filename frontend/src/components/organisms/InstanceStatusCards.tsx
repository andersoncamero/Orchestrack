import { useNavigate } from 'react-router-dom'
import { Server, Cpu, MemoryStick, HardDrive, Activity } from 'lucide-react'
import { Badge } from '../atoms/Badge'
import { useLanguage } from '../../contexts/LanguageContext'
import { formatDuration } from '../../utils/time'
import type { Instance } from '../../types'

interface InstanceStatusCardsProps {
  instances: Instance[]
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-(--color-bg-base) rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  )
}

function getColor(value: number): string {
  if (value > 80) return 'bg-(--color-status-exited)'
  if (value > 50) return 'bg-(--color-status-warning)'
  return 'bg-(--color-status-running)'
}

export function InstanceStatusCards({ instances }: InstanceStatusCardsProps) {
  const navigate = useNavigate()
  const { t } = useLanguage()

  if (instances.length === 0) {
    return (
      <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6">
        <p className="text-(--color-text-muted)">{t('noInstances')}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {instances.map((instance) => {
        const m = instance.host_metrics
        return (
          <button
            key={instance.service_id}
            onClick={() => navigate(`/instances/${instance.service_id}`)}
            className="text-left bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 hover:border-(--color-border-strong) hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-(--color-primary-subtle) border border-(--color-primary)/30 flex items-center justify-center">
                  <Server className="w-6 h-6 text-(--color-primary)" />
                </div>
                <div>
                  <h3 className="text-(--color-text-main) font-semibold">{instance.hostname}</h3>
                  <p className="text-(--color-text-muted) text-xs font-mono">{instance.service_id}</p>
                </div>
              </div>
              <Badge state={instance.status} />
            </div>

            {m ? (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-(--color-text-muted)">
                      <Cpu className="w-3.5 h-3.5" /> CPU
                    </span>
                    <span className="text-(--color-text-main) font-medium">{m.cpu_percent.toFixed(1)}%</span>
                  </div>
                  <MiniBar value={m.cpu_percent} color={getColor(m.cpu_percent)} />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-(--color-text-muted)">
                      <MemoryStick className="w-3.5 h-3.5" /> {t('memory')}
                    </span>
                    <span className="text-(--color-text-main) font-medium">{m.memory_percent.toFixed(1)}%</span>
                  </div>
                  <MiniBar value={m.memory_percent} color={getColor(m.memory_percent)} />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-(--color-text-muted)">
                      <HardDrive className="w-3.5 h-3.5" /> {t('disk')}
                    </span>
                    <span className="text-(--color-text-main) font-medium">{m.disk_percent.toFixed(1)}%</span>
                  </div>
                  <MiniBar value={m.disk_percent} color={getColor(m.disk_percent)} />
                </div>
                <div className="pt-2 flex items-center justify-between text-xs text-(--color-text-muted)">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> {t('loadAverage')}: {m.load_average.toFixed(2)}
                  </span>
                  <span>{formatDuration(m.uptime_seconds)}</span>
                </div>
              </div>
            ) : (
              <p className="text-(--color-text-muted) text-sm">{t('noHostMetrics')}</p>
            )}
          </button>
        )
      })}
    </div>
  )
}
