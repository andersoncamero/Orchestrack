import { useLanguage } from '../../contexts/LanguageContext'
import type { HostMetrics } from '../../types'

interface ResourceBarChartProps {
  metrics?: HostMetrics
}

export function ResourceBarChart({ metrics }: ResourceBarChartProps) {
  const { t } = useLanguage()

  if (!metrics) {
    return (
      <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6">
        <p className="text-(--color-text-muted)">{t('noData')}</p>
      </div>
    )
  }

  const data = [
    { label: t('cpu'), value: metrics.cpu_percent, color: 'bg-(--color-primary)' },
    { label: t('memory'), value: metrics.memory_percent, color: 'bg-(--color-status-running)' },
    { label: t('disk'), value: metrics.disk_percent, color: 'bg-(--color-status-info)' },
    { label: t('loadAverage'), value: metrics.cpu_cores > 0 ? Math.min((metrics.load_average / metrics.cpu_cores) * 100, 100) : 0, color: 'bg-(--color-status-neutral)' },
  ]

  const maxValue = Math.max(...data.map((d) => d.value), 100)

  return (
    <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5">
      <h4 className="text-(--color-text-main) font-semibold mb-4">{t('resourceUsage')}</h4>
      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-(--color-text-main) text-sm font-medium">{item.label}</span>
              <span className="text-(--color-text-muted) text-sm">{item.value.toFixed(1)}%</span>
            </div>
            <div className="h-8 bg-(--color-bg-base) rounded-lg overflow-hidden">
              <div
                className={`h-full ${item.color} transition-all duration-500 flex items-center justify-end px-2`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              >
                <span className="text-white text-xs font-semibold">{item.value.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
