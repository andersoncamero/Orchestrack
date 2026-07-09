import { Server, Cpu, MemoryStick, HardDrive } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import type { Instance } from '../../types'

interface SystemStatsCardsProps {
  instances: Instance[]
}

interface StatCardData {
  title: string
  value: string
  subtitle: string
  icon: React.ElementType
  color: 'primary' | 'emerald' | 'amber' | 'rose' | 'slate'
}

const colorMap = {
  primary: {
    bg: 'bg-(--color-primary-subtle)',
    border: 'border-(--color-primary)/30',
    text: 'text-(--color-primary)',
    icon: 'text-(--color-primary)',
  },
  emerald: {
    bg: 'bg-(--color-status-running-subtle)',
    border: 'border-(--color-status-running)/30',
    text: 'text-(--color-status-running)',
    icon: 'text-(--color-status-running)',
  },
  amber: {
    bg: 'bg-(--color-status-warning-subtle)',
    border: 'border-(--color-status-warning)/30',
    text: 'text-(--color-status-warning)',
    icon: 'text-(--color-status-warning)',
  },
  rose: {
    bg: 'bg-(--color-status-exited-subtle)',
    border: 'border-(--color-status-exited)/30',
    text: 'text-(--color-status-exited)',
    icon: 'text-(--color-status-exited)',
  },
  slate: {
    bg: 'bg-(--color-status-neutral-subtle)',
    border: 'border-(--color-status-neutral)/30',
    text: 'text-(--color-status-neutral)',
    icon: 'text-(--color-status-neutral)',
  },
}

function average(metrics: number[]): number {
  if (metrics.length === 0) return 0
  return metrics.reduce((a, b) => a + b, 0) / metrics.length
}

export function SystemStatsCards({ instances }: SystemStatsCardsProps) {
  const { t } = useLanguage()
  const onlineCount = instances.filter((i) => i.status === 'online').length
  const offlineCount = instances.filter((i) => i.status === 'offline').length
  const withMetrics = instances.filter((i) => i.host_metrics)

  const avgCpu = average(withMetrics.map((i) => i.host_metrics!.cpu_percent))
  const avgMem = average(withMetrics.map((i) => i.host_metrics!.memory_percent))
  const avgDisk = average(withMetrics.map((i) => i.host_metrics!.disk_percent))

  const stats: StatCardData[] = [
    {
      title: t('activeHosts'),
      value: `${onlineCount}`,
      subtitle: `${onlineCount} ${t('online')} / ${offlineCount} ${t('offline')}`,
      icon: Server,
      color: 'primary',
    },
    {
      title: t('avgCpuUsage'),
      value: `${avgCpu.toFixed(1)}%`,
      subtitle: t('clusterAverage'),
      icon: Cpu,
      color: avgCpu > 80 ? 'rose' : avgCpu > 50 ? 'amber' : 'emerald',
    },
    {
      title: t('avgMemoryUsage'),
      value: `${avgMem.toFixed(1)}%`,
      subtitle: t('clusterAverage'),
      icon: MemoryStick,
      color: avgMem > 80 ? 'rose' : avgMem > 50 ? 'amber' : 'emerald',
    },
    {
      title: t('avgDiskUsage'),
      value: `${avgDisk.toFixed(1)}%`,
      subtitle: t('clusterAverage'),
      icon: HardDrive,
      color: avgDisk > 80 ? 'rose' : avgDisk > 50 ? 'amber' : 'emerald',
    },
  ]

  const cardContent = (stat: StatCardData) => {
    const colors = colorMap[stat.color]
    return (
      <>
        <div
          className={`w-14 h-14 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center`}
        >
          <stat.icon className={`w-7 h-7 ${colors.icon}`} />
        </div>
        <div>
          <p className="text-(--color-text-muted) text-sm font-medium">{stat.title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-(--color-text-main)">{stat.value}</span>
            <span className={`text-sm font-medium ${colors.text}`}>{stat.subtitle}</span>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 flex items-center gap-4 hover:border-(--color-border-strong) transition-colors"
        >
          {cardContent(stat)}
        </div>
      ))}
    </div>
  )
}
