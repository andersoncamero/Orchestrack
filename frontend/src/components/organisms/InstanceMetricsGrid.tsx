import { Cpu, HardDrive, MemoryStick, Activity, Clock, Server, Container } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { formatBytes, formatDuration } from '../../utils/time'
import type { HostMetrics } from '../../types'

interface InstanceMetricsGridProps {
  metrics?: HostMetrics
  runningContainers?: number
  totalContainers?: number
}

interface MetricCardProps {
  icon: React.ElementType
  label: string
  value: string
  subvalue?: string
  percent: number
  color: string
}

function getUsageColor(value: number): string {
  if (value > 80) return 'bg-(--color-status-exited)'
  if (value > 50) return 'bg-(--color-status-warning)'
  return 'bg-(--color-status-running)'
}

function MetricCard({ icon: Icon, label, value, subvalue, percent, color }: MetricCardProps) {
  const barColor = color || getUsageColor(percent)

  return (
    <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 hover:border-(--color-border-strong) transition-colors flex flex-col justify-between h-36">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-(--color-text-muted) text-xs font-medium uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-(--color-text-main) mt-1">{value}</p>
          {subvalue && <p className="text-(--color-text-muted) text-xs mt-1">{subvalue}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg bg-(--color-bg-base) border border-(--color-border) flex items-center justify-center">
          <Icon className="w-5 h-5 text-(--color-primary)" />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-2 w-full bg-(--color-bg-base) rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-500`}
            style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
          />
        </div>
        <p className="text-(--color-text-muted) text-xs text-right">{percent.toFixed(1)}%</p>
      </div>
    </div>
  )
}

export function InstanceMetricsGrid({ metrics, runningContainers = 0, totalContainers = 0 }: InstanceMetricsGridProps) {
  const { t } = useLanguage()

  if (!metrics) {
    return (
      <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6">
        <p className="text-(--color-text-muted)">{t('noData')}</p>
      </div>
    )
  }

  const containerPercent = totalContainers > 0 ? (runningContainers / totalContainers) * 100 : 0

  const cards = [
    {
      icon: Cpu,
      label: t('cpu'),
      value: `${metrics.cpu_percent.toFixed(1)}%`,
      subvalue: `${metrics.cpu_cores} cores`,
      percent: metrics.cpu_percent,
      color: getUsageColor(metrics.cpu_percent),
    },
    {
      icon: MemoryStick,
      label: t('memory'),
      value: `${metrics.memory_percent.toFixed(1)}%`,
      subvalue: `${formatBytes(metrics.memory_used)} / ${formatBytes(metrics.memory_total)}`,
      percent: metrics.memory_percent,
      color: getUsageColor(metrics.memory_percent),
    },
    {
      icon: HardDrive,
      label: t('disk'),
      value: `${metrics.disk_percent.toFixed(1)}%`,
      subvalue: `${formatBytes(metrics.disk_used)} / ${formatBytes(metrics.disk_total)}`,
      percent: metrics.disk_percent,
      color: getUsageColor(metrics.disk_percent),
    },
    {
      icon: Activity,
      label: t('loadAverage'),
      value: metrics.load_average.toFixed(2),
      subvalue: `${metrics.cpu_cores} cores`,
      percent: metrics.cpu_cores > 0 ? Math.min((metrics.load_average / metrics.cpu_cores) * 100, 100) : 0,
      color: metrics.cpu_cores > 0 && metrics.load_average > metrics.cpu_cores * 0.9 ? 'bg-(--color-status-warning)' : 'bg-(--color-status-running)',
    },
    {
      icon: Clock,
      label: t('uptime'),
      value: formatDuration(metrics.uptime_seconds),
      percent: 100,
      color: 'bg-(--color-primary)',
    },
    {
      icon: Server,
      label: t('platform'),
      value: metrics.platform,
      percent: 100,
      color: 'bg-(--color-status-neutral)',
    },
    {
      icon: Container,
      label: t('runningContainers'),
      value: `${runningContainers}`,
      subvalue: `${t('total')}: ${totalContainers}`,
      percent: containerPercent,
      color: containerPercent >= 80 ? 'bg-(--color-status-running)' : 'bg-(--color-primary)',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <MetricCard key={card.label} {...card} />
      ))}
    </div>
  )
}
