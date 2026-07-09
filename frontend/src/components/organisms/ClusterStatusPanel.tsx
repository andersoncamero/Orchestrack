import { Server, Wifi, WifiOff } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import type { Instance } from '../../types'

interface ClusterStatusPanelProps {
  instances: Instance[]
}

export function ClusterStatusPanel({ instances }: ClusterStatusPanelProps) {
  const { t } = useLanguage()
  const total = instances.length
  const online = instances.filter((i) => i.status === 'online').length
  const offline = instances.filter((i) => i.status === 'offline').length
  const onlinePct = total > 0 ? (online / total) * 100 : 0
  const offlinePct = total > 0 ? (offline / total) * 100 : 0

  const radius = 35
  const stroke = 8
  const circumference = 2 * Math.PI * radius
  const onlineOffset = circumference * (1 - onlinePct / 100)

  return (
    <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <Server className="w-5 h-5 text-(--color-primary)" />
        <h3 className="text-(--color-text-main) font-semibold text-base">{t('clusterStatus')}</h3>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative" style={{ width: radius * 2 + stroke, height: radius * 2 + stroke }}>
          <svg width={radius * 2 + stroke} height={radius * 2 + stroke}>
            <circle
              cx={radius + stroke / 2}
              cy={radius + stroke / 2}
              r={radius}
              fill="none"
              stroke="var(--color-bg-base)"
              strokeWidth={stroke}
            />
            <circle
              cx={radius + stroke / 2}
              cy={radius + stroke / 2}
              r={radius}
              fill="none"
              stroke="var(--color-status-running)"
              strokeWidth={stroke}
              strokeDasharray={circumference}
              strokeDashoffset={onlineOffset}
              className="transition-all duration-700"
              transform={`rotate(-90 ${radius + stroke / 2} ${radius + stroke / 2})`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-(--color-text-main)">{online}</span>
            <span className="text-[8px] text-(--color-text-muted) uppercase tracking-wider">{t('online')}</span>
          </div>
        </div>

        <div className="flex-1 w-full space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="flex items-center gap-2 text-(--color-text-main) font-medium">
                <Wifi className="w-4 h-4 text-(--color-status-running)" />
                {t('online')}
              </span>
              <span className="font-semibold text-(--color-status-running)">{online}</span>
            </div>
            <div className="h-2 w-full bg-(--color-bg-base) rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-(--color-status-running) transition-all duration-500"
                style={{ width: `${onlinePct}%` }}
              />
            </div>
            <p className="text-xs text-(--color-text-muted) mt-1">{onlinePct.toFixed(1)}% {t('of')} {total} {t('machines')}</p>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="flex items-center gap-2 text-(--color-text-main) font-medium">
                <WifiOff className="w-4 h-4 text-(--color-status-exited)" />
                {t('offline')}
              </span>
              <span className="font-semibold text-(--color-status-exited)">{offline}</span>
            </div>
            <div className="h-2 w-full bg-(--color-bg-base) rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-(--color-status-exited) transition-all duration-500"
                style={{ width: `${offlinePct}%` }}
              />
            </div>
            <p className="text-xs text-(--color-text-muted) mt-1">{offlinePct.toFixed(1)}% {t('of')} {total} {t('machines')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
