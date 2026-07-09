import { Cpu, HardDrive, MemoryStick, Activity, Clock, Server } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import type { HostMetrics } from '../../types'
import { formatBytes, formatDuration } from '../../utils/time'

interface HostMetricsCardProps {
  metrics?: HostMetrics
}

interface MetricItemProps {
  icon: React.ElementType
  label: string
  value: string
  subvalue?: string
  color: string
}

function MetricItem({ icon: Icon, label, value, subvalue, color }: MetricItemProps) {
  return (
    <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-4 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-(--color-text-muted) text-xs font-medium uppercase tracking-wider">{label}</p>
        <p className="text-(--color-text-main) text-xl font-bold truncate">{value}</p>
        {subvalue && <p className="text-(--color-text-secondary) text-xs truncate">{subvalue}</p>}
      </div>
    </div>
  )
}

export function HostMetricsCard({ metrics }: HostMetricsCardProps) {
  const { t } = useLanguage()

  if (!metrics) {
    return (
      <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6">
        <p className="text-(--color-text-muted) text-sm">{t('noData')}</p>
      </div>
    )
  }

  const cpuColor = metrics.cpu_percent > 80 ? 'bg-(--color-status-exited)' : metrics.cpu_percent > 50 ? 'bg-(--color-status-warning)' : 'bg-(--color-primary)'
  const memColor = metrics.memory_percent > 80 ? 'bg-(--color-status-exited)' : metrics.memory_percent > 50 ? 'bg-(--color-status-warning)' : 'bg-(--color-status-running)'
  const diskColor = metrics.disk_percent > 80 ? 'bg-(--color-status-exited)' : metrics.disk_percent > 50 ? 'bg-(--color-status-warning)' : 'bg-(--color-status-info)'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <MetricItem
        icon={Cpu}
        label={t('cpu')}
        value={`${metrics.cpu_percent.toFixed(1)}%`}
        subvalue={`${metrics.cpu_cores} cores`}
        color={cpuColor}
      />
      <MetricItem
        icon={MemoryStick}
        label={t('memory')}
        value={`${metrics.memory_percent.toFixed(1)}%`}
        subvalue={`${formatBytes(metrics.memory_used)} / ${formatBytes(metrics.memory_total)}`}
        color={memColor}
      />
      <MetricItem
        icon={HardDrive}
        label={t('disk')}
        value={`${metrics.disk_percent.toFixed(1)}%`}
        subvalue={`${formatBytes(metrics.disk_used)} / ${formatBytes(metrics.disk_total)}`}
        color={diskColor}
      />
      <MetricItem
        icon={Activity}
        label={t('loadAverage')}
        value={metrics.load_average.toFixed(2)}
        color="bg-(--color-status-neutral)"
      />
      <MetricItem
        icon={Clock}
        label={t('uptime')}
        value={formatDuration(metrics.uptime_seconds)}
        color="bg-(--color-primary)"
      />
      <MetricItem
        icon={Server}
        label={t('platform')}
        value={metrics.platform}
        color="bg-(--color-status-neutral)"
      />
    </div>
  )
}
