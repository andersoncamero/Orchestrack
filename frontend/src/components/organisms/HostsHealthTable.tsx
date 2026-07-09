import { useNavigate } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { Badge } from '../atoms/Badge'
import { Button } from '../atoms/Button'
import { useLanguage } from '../../contexts/LanguageContext'
import { formatDuration, timeAgo } from '../../utils/time'
import type { Instance } from '../../types'

interface HostsHealthTableProps {
  instances: Instance[]
}

function usageColor(value: number): string {
  if (value > 80) return 'text-(--color-status-exited)'
  if (value > 50) return 'text-(--color-status-warning)'
  return 'text-(--color-status-running)'
}

function progressColor(value: number): string {
  if (value > 80) return 'bg-(--color-status-exited)'
  if (value > 50) return 'bg-(--color-status-warning)'
  return 'bg-(--color-status-running)'
}

function MiniProgress({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-20 bg-(--color-bg-base) rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${progressColor(value)}`}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  )
}

export function HostsHealthTable({ instances }: HostsHealthTableProps) {
  const navigate = useNavigate()
  const { t } = useLanguage()

  return (
    <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl overflow-hidden h-full flex flex-col">
      <div className="px-6 py-4 border-b border-(--color-border) flex items-center justify-between">
        <h3 className="text-(--color-text-main) font-semibold text-lg">
          {t('systemHealthOverview')} ({instances.length} {t('hostsRegistered')})
        </h3>
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full">
          <thead className="bg-(--color-bg-surface)">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('status')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('hostname')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('cpu')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('memory')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('disk')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('loadAverage')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('uptime')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('lastHeartbeat')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--color-border)">
            {instances.map((instance) => {
              const m = instance.host_metrics
              return (
                <tr key={instance.service_id} className="hover:bg-(--color-bg-surface-hover)/60 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge state={instance.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-(--color-text-main) font-medium">{instance.hostname}</div>
                    <div className="text-(--color-text-muted) font-mono text-xs">{instance.service_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {m ? (
                      <div className="flex items-center gap-3">
                        <span className={`font-semibold ${usageColor(m.cpu_percent)}`}>{m.cpu_percent.toFixed(1)}%</span>
                        <MiniProgress value={m.cpu_percent} />
                      </div>
                    ) : (
                      <span className="text-(--color-text-muted) text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {m ? (
                      <div className="flex items-center gap-3">
                        <span className={`font-semibold ${usageColor(m.memory_percent)}`}>{m.memory_percent.toFixed(1)}%</span>
                        <MiniProgress value={m.memory_percent} />
                      </div>
                    ) : (
                      <span className="text-(--color-text-muted) text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {m ? (
                      <div className="flex items-center gap-3">
                        <span className={`font-semibold ${usageColor(m.disk_percent)}`}>{m.disk_percent.toFixed(1)}%</span>
                        <MiniProgress value={m.disk_percent} />
                      </div>
                    ) : (
                      <span className="text-(--color-text-muted) text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-(--color-text-secondary)">
                    {m ? m.load_average.toFixed(2) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-(--color-text-secondary)">
                    {m ? formatDuration(m.uptime_seconds) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-(--color-text-secondary)">{timeAgo(instance.last_seen)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Button
                      variant="secondary"
                      onClick={() => navigate(`/instances/${instance.service_id}`)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      {t('viewDetails')}
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
