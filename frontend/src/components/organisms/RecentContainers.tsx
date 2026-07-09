import { RotateCcw } from 'lucide-react'
import { Badge } from '../atoms/Badge'
import { useLanguage } from '../../contexts/LanguageContext'
import type { ContainerSummary, Instance } from '../../types'
import { timeAgo } from '../../utils/time'

interface RecentContainersProps {
  containers: ContainerSummary[]
  instances: Instance[]
  onStart: (id: string) => void
  onStop: (id: string) => void
  onRestart: (id: string) => void
}

export function RecentContainers({ containers, instances, onStart, onStop, onRestart }: RecentContainersProps) {
  const { t } = useLanguage()
  const recent = [...containers].sort((a, b) => b.created - a.created).slice(0, 5)

  const getHostname = (serviceId?: string) => {
    if (!serviceId) return '-'
    return instances.find((i) => i.service_id === serviceId)?.hostname || serviceId
  }

  return (
    <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-(--color-border) flex items-center justify-between">
        <h3 className="text-(--color-text-main) font-semibold text-lg">{t('recentContainers')} ({t('stateChanges')})</h3>
      </div>
      <div className="p-6 space-y-3 bg-(--color-bg-base)">
        {recent.map((container) => {
          const isRunning = container.state === 'running'
          return (
            <div
              key={container.id}
              className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-4 flex items-center justify-between hover:border-(--color-border-strong) hover:shadow-sm transition-all"
            >
              <div className="min-w-0 flex-1 grid grid-cols-5 items-center gap-4">
                <div className="col-span-2">
                  <h4 className="text-(--color-text-main) font-medium truncate">{container.name || container.id.slice(0, 12)}</h4>
                  <p className="text-(--color-text-muted) text-sm truncate">({container.image})</p>
                </div>
                <div className="text-(--color-text-secondary) text-sm truncate">{getHostname(container.service_id)}</div>
                <div>
                  <Badge state={container.state} />
                </div>
                <div className="text-(--color-text-muted) text-sm">{timeAgo(container.created)}</div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                {!isRunning && (
                  <button
                    onClick={() => onStart(container.id)}
                    className="px-3 py-1.5 bg-(--color-status-running-subtle) hover:bg-(--color-status-running)/20 text-(--color-status-running) text-sm font-medium rounded-lg transition-colors"
                  >
                    {t('start')}
                  </button>
                )}
                {isRunning && (
                  <button
                    onClick={() => onStop(container.id)}
                    className="px-3 py-1.5 bg-(--color-status-exited-subtle) hover:bg-(--color-status-exited)/20 text-(--color-status-exited) text-sm font-medium rounded-lg transition-colors"
                  >
                    {t('stop')}
                  </button>
                )}
                <button
                  onClick={() => onRestart(container.id)}
                  className="p-1.5 bg-(--color-bg-surface-hover) hover:bg-(--color-border) text-(--color-text-main) rounded-lg transition-colors"
                  title={t('restart')}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
        {recent.length === 0 && (
          <p className="text-(--color-text-muted) text-center py-8">{t('noRecentContainers')}</p>
        )}
      </div>
    </div>
  )
}
