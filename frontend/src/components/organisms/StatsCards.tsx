import { Play, Server, Square, Container } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import type { ContainerSummary, Instance } from '../../types'

interface StatsCardsProps {
  instances: Instance[]
  containers: ContainerSummary[]
}

interface StatCardData {
  title: string
  value: number
  subtitle: string
  icon: React.ElementType
  color: 'primary' | 'slate' | 'emerald' | 'rose'
}

const colorMap = {
  primary: {
    bg: 'bg-(--color-primary-subtle)',
    border: 'border-(--color-primary)/30',
    text: 'text-(--color-primary)',
    icon: 'text-(--color-primary)',
  },
  slate: {
    bg: 'bg-(--color-status-neutral-subtle)',
    border: 'border-(--color-status-neutral)/30',
    text: 'text-(--color-status-neutral)',
    icon: 'text-(--color-status-neutral)',
  },
  emerald: {
    bg: 'bg-(--color-status-running-subtle)',
    border: 'border-(--color-status-running)/30',
    text: 'text-(--color-status-running)',
    icon: 'text-(--color-status-running)',
  },
  rose: {
    bg: 'bg-(--color-status-exited-subtle)',
    border: 'border-(--color-status-exited)/30',
    text: 'text-(--color-status-exited)',
    icon: 'text-(--color-status-exited)',
  },
}

export function StatsCards({ instances, containers }: StatsCardsProps) {
  const { t } = useLanguage()
  const onlineCount = instances.filter((i) => i.status === 'online').length
  const running = containers.filter((c) => c.state === 'running').length
  const stopped = containers.filter((c) => c.state !== 'running').length
  const runningPct = containers.length > 0 ? Math.round((running / containers.length) * 100) : 0

  const stats: StatCardData[] = [
    {
      title: t('activeHosts'),
      value: onlineCount,
      subtitle: `${onlineCount} ${t('online')}`,
      icon: Server,
      color: 'primary',
    },
    {
      title: t('totalContainers'),
      value: containers.length,
      subtitle: t('containers'),
      icon: Container,
      color: 'slate',
    },
    {
      title: t('running'),
      value: running,
      subtitle: `(${runningPct}%)`,
      icon: Play,
      color: 'emerald',
    },
    {
      title: t('stopped'),
      subtitle: t('exitedCreated'),
      value: stopped,
      icon: Square,
      color: 'rose',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const colors = colorMap[stat.color]
        return (
          <div
            key={stat.title}
            className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 flex items-center gap-4 hover:border-(--color-border-strong) transition-colors"
          >
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
          </div>
        )
      })}
    </div>
  )
}
