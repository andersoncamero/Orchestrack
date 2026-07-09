import { AlertTriangle, ServerOff, Cpu, MemoryStick, HardDrive, Activity, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { timeAgo } from '../../utils/time'
import type { Instance } from '../../types'

interface SystemAlertsProps {
  instances: Instance[]
}

interface AlertItem {
  id: string
  severity: 'critical' | 'warning' | 'info'
  icon: React.ElementType
  message: string
  host: string
  timestamp: number
}

const severityStyles = {
  critical: {
    border: 'border-(--color-status-exited)/40',
    bg: 'bg-(--color-status-exited-subtle)',
    iconBg: 'bg-(--color-status-exited)',
    text: 'text-(--color-status-exited)',
  },
  warning: {
    border: 'border-(--color-status-warning)/40',
    bg: 'bg-(--color-status-warning-subtle)',
    iconBg: 'bg-(--color-status-warning)',
    text: 'text-(--color-status-warning)',
  },
  info: {
    border: 'border-(--color-status-info)/40',
    bg: 'bg-(--color-status-info-subtle)',
    iconBg: 'bg-(--color-status-info)',
    text: 'text-(--color-status-info)',
  },
}

function buildAlerts(instances: Instance[], t: (key: string) => string): AlertItem[] {
  const alerts: AlertItem[] = []

  instances.forEach((instance) => {
    if (instance.status === 'offline') {
      alerts.push({
        id: `${instance.service_id}-offline`,
        severity: 'critical',
        icon: ServerOff,
        message: t('hostOfflineAlert'),
        host: instance.hostname,
        timestamp: instance.last_seen,
      })
      return
    }

    const m = instance.host_metrics
    if (!m) return

    if (m.cpu_percent > 80) {
      alerts.push({
        id: `${instance.service_id}-cpu`,
        severity: 'critical',
        icon: Cpu,
        message: t('cpuHighAlert').replace('{value}', m.cpu_percent.toFixed(1)),
        host: instance.hostname,
        timestamp: Date.now() / 1000,
      })
    } else if (m.cpu_percent > 50) {
      alerts.push({
        id: `${instance.service_id}-cpu-warning`,
        severity: 'warning',
        icon: Cpu,
        message: t('cpuWarningAlert').replace('{value}', m.cpu_percent.toFixed(1)),
        host: instance.hostname,
        timestamp: Date.now() / 1000,
      })
    }

    if (m.memory_percent > 80) {
      alerts.push({
        id: `${instance.service_id}-memory`,
        severity: 'critical',
        icon: MemoryStick,
        message: t('memoryHighAlert').replace('{value}', m.memory_percent.toFixed(1)),
        host: instance.hostname,
        timestamp: Date.now() / 1000,
      })
    } else if (m.memory_percent > 50) {
      alerts.push({
        id: `${instance.service_id}-memory-warning`,
        severity: 'warning',
        icon: MemoryStick,
        message: t('memoryWarningAlert').replace('{value}', m.memory_percent.toFixed(1)),
        host: instance.hostname,
        timestamp: Date.now() / 1000,
      })
    }

    if (m.disk_percent > 80) {
      alerts.push({
        id: `${instance.service_id}-disk`,
        severity: 'critical',
        icon: HardDrive,
        message: t('diskHighAlert').replace('{value}', m.disk_percent.toFixed(1)),
        host: instance.hostname,
        timestamp: Date.now() / 1000,
      })
    } else if (m.disk_percent > 50) {
      alerts.push({
        id: `${instance.service_id}-disk-warning`,
        severity: 'warning',
        icon: HardDrive,
        message: t('diskWarningAlert').replace('{value}', m.disk_percent.toFixed(1)),
        host: instance.hostname,
        timestamp: Date.now() / 1000,
      })
    }

    if (m.cpu_cores > 0 && m.load_average > m.cpu_cores * 0.9) {
      alerts.push({
        id: `${instance.service_id}-load`,
        severity: 'warning',
        icon: Activity,
        message: t('loadHighAlert').replace('{value}', m.load_average.toFixed(2)),
        host: instance.hostname,
        timestamp: Date.now() / 1000,
      })
    }
  })

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity]
    }
    return b.timestamp - a.timestamp
  })
}

export function SystemAlerts({ instances }: SystemAlertsProps) {
  const { t } = useLanguage()
  const alerts = buildAlerts(instances, t)

  if (alerts.length === 0) {
    return (
      <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle2 className="w-6 h-6 text-(--color-status-running)" />
          <h3 className="text-(--color-text-main) font-semibold text-lg">{t('systemAlerts')}</h3>
        </div>
        <p className="text-(--color-text-muted)">{t('noSystemAlerts')}</p>
      </div>
    )
  }

  return (
    <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="w-6 h-6 text-(--color-status-warning)" />
        <h3 className="text-(--color-text-main) font-semibold text-lg">
          {t('systemAlerts')} ({alerts.length})
        </h3>
      </div>
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {alerts.map((alert) => {
          const styles = severityStyles[alert.severity]
          return (
            <div
              key={alert.id}
              className={`flex items-start gap-4 p-4 rounded-xl border ${styles.border} ${styles.bg}`}
            >
              <div className={`w-10 h-10 rounded-lg ${styles.iconBg} flex items-center justify-center shrink-0`}>
                <alert.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-(--color-text-main) font-medium text-sm">{alert.message}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className={`text-xs font-medium ${styles.text}`}>{alert.host}</p>
                  <p className="text-(--color-text-muted) text-xs">{timeAgo(alert.timestamp)}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
