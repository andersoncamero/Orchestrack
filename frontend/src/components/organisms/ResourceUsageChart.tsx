import { useLanguage } from '../../contexts/LanguageContext'
import type { Instance } from '../../types'

interface ResourceUsageChartProps {
  instances: Instance[]
}

const metricConfig = [
  { key: 'cpu_percent', label: 'cpu', color: '--color-primary' },
  { key: 'memory_percent', label: 'memory', color: '--color-status-running' },
  { key: 'disk_percent', label: 'disk', color: '--color-status-info' },
] as const

export function ResourceUsageChart({ instances }: ResourceUsageChartProps) {
  const { t } = useLanguage()
  const hosts = instances.filter((i) => i.host_metrics).slice(0, 10)

  if (hosts.length === 0) {
    return (
      <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6 flex items-center justify-center h-80">
        <p className="text-(--color-text-muted)">{t('noHostMetrics')}</p>
      </div>
    )
  }

  return (
    <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-(--color-text-main) font-semibold text-lg">{t('resourceUsageByHost')}</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {hosts.map((instance) => {
          const m = instance.host_metrics!
          return (
            <div key={instance.service_id}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-(--color-text-main) font-medium text-sm truncate" title={instance.hostname}>
                  {instance.hostname}
                </span>
                <span className="text-(--color-text-muted) text-xs font-mono">{instance.service_id}</span>
              </div>
              <div className="space-y-2">
                {metricConfig.map((metric) => {
                  const value = m[metric.key] as number
                  return (
                    <div key={metric.key} className="flex items-center gap-3">
                      <span className="text-(--color-text-muted) text-xs w-16">{t(metric.label)}</span>
                      <div className="flex-1 h-2 bg-(--color-bg-base) rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${Math.min(Math.max(value, 0), 100)}%`,
                            backgroundColor: `var(${metric.color})`,
                          }}
                        />
                      </div>
                      <span className="text-(--color-text-main) text-xs font-semibold w-12 text-right">
                        {value.toFixed(1)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
