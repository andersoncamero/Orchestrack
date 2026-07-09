import { AlertTriangle, Cpu, HardDrive, MemoryStick, ServerOff, Activity } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import type { Instance } from '../../types'

interface InstanceAlertsTableProps {
  instance: Instance
}

interface AlertItem {
  id: string
  severity: 'critical' | 'warning'
  icon: React.ElementType
  message: string
}

function buildAlerts(instance: Instance, t: (key: string) => string): AlertItem[] {
  const alerts: AlertItem[] = []

  if (instance.status === 'offline') {
    alerts.push({ id: 'offline', severity: 'critical', icon: ServerOff, message: t('hostOfflineAlert') })
    return alerts
  }

  const m = instance.host_metrics
  if (!m) return alerts

  if (m.cpu_percent > 80) {
    alerts.push({ id: 'cpu-critical', severity: 'critical', icon: Cpu, message: t('cpuHighAlert').replace('{value}', m.cpu_percent.toFixed(1)) })
  } else if (m.cpu_percent > 50) {
    alerts.push({ id: 'cpu-warning', severity: 'warning', icon: Cpu, message: t('cpuWarningAlert').replace('{value}', m.cpu_percent.toFixed(1)) })
  }

  if (m.memory_percent > 80) {
    alerts.push({ id: 'memory-critical', severity: 'critical', icon: MemoryStick, message: t('memoryHighAlert').replace('{value}', m.memory_percent.toFixed(1)) })
  } else if (m.memory_percent > 50) {
    alerts.push({ id: 'memory-warning', severity: 'warning', icon: MemoryStick, message: t('memoryWarningAlert').replace('{value}', m.memory_percent.toFixed(1)) })
  }

  if (m.disk_percent > 80) {
    alerts.push({ id: 'disk-critical', severity: 'critical', icon: HardDrive, message: t('diskHighAlert').replace('{value}', m.disk_percent.toFixed(1)) })
  } else if (m.disk_percent > 50) {
    alerts.push({ id: 'disk-warning', severity: 'warning', icon: HardDrive, message: t('diskWarningAlert').replace('{value}', m.disk_percent.toFixed(1)) })
  }

  if (m.cpu_cores > 0 && m.load_average > m.cpu_cores * 0.9) {
    alerts.push({ id: 'load-warning', severity: 'warning', icon: Activity, message: t('loadHighAlert').replace('{value}', m.load_average.toFixed(2)) })
  }

  return alerts
}

export function InstanceAlertsTable({ instance }: InstanceAlertsTableProps) {
  const { t } = useLanguage()
  const alerts = buildAlerts(instance, t)

  if (alerts.length === 0) {
    return (
      <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-(--color-status-warning)" />
          <h4 className="text-(--color-text-main) font-semibold">{t('alerts')}</h4>
        </div>
        <p className="text-(--color-text-muted)">{t('noSystemAlerts')}</p>
      </div>
    )
  }

  return (
    <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-(--color-border) flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-(--color-status-warning)" />
        <h4 className="text-(--color-text-main) font-semibold">{t('alerts')}</h4>
        <span className="ml-auto text-(--color-text-muted) text-sm">{alerts.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-(--color-bg-surface)">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('status')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('message')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--color-border)">
            {alerts.map((alert) => {
              const severityStyles =
                alert.severity === 'critical'
                  ? 'bg-(--color-status-exited-subtle) text-(--color-status-exited) border-(--color-status-exited)/30'
                  : 'bg-(--color-status-warning-subtle) text-(--color-status-warning) border-(--color-status-warning)/30'
              return (
                <tr key={alert.id} className="hover:bg-(--color-bg-surface-hover)/50 transition-colors">
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${severityStyles}`}>
                      <alert.icon className="w-3.5 h-3.5" />
                      {alert.severity === 'critical' ? t('critical') : t('warning')}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-(--color-text-main) text-sm">{alert.message}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
