import { useMemo, useState } from 'react'
import { Bell, Server, AlertTriangle, CheckCircle2, Eye, ArrowLeft } from 'lucide-react'
import { MainLayout } from '../templates/MainLayout'
import { Spinner } from '../atoms/Spinner'
import { Badge } from '../atoms/Badge'
import { Button } from '../atoms/Button'
import { SystemAlerts } from '../organisms/SystemAlerts'
import { useInstances } from '../../hooks/useInstances'
import { useLanguage } from '../../contexts/LanguageContext'
import type { Instance } from '../../types'

interface AlertCount {
  critical: number
  warning: number
  total: number
}

function countAlerts(instance: Instance): AlertCount {
  const count: AlertCount = { critical: 0, warning: 0, total: 0 }

  if (instance.status === 'offline') {
    count.critical += 1
    count.total += 1
    return count
  }

  const m = instance.host_metrics
  if (!m) return count

  if (m.cpu_percent > 80) {
    count.critical += 1
  } else if (m.cpu_percent > 50) {
    count.warning += 1
  }

  if (m.memory_percent > 80) {
    count.critical += 1
  } else if (m.memory_percent > 50) {
    count.warning += 1
  }

  if (m.disk_percent > 80) {
    count.critical += 1
  } else if (m.disk_percent > 50) {
    count.warning += 1
  }

  if (m.cpu_cores > 0 && m.load_average > m.cpu_cores * 0.9) {
    count.warning += 1
  }

  count.total = count.critical + count.warning
  return count
}

export default function AlertsPage() {
  const { t } = useLanguage()
  const { instances, loading, error } = useInstances()
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null)

  const selectedInstanceData = useMemo(() => {
    return instances.find((i) => i.service_id === selectedInstance) || null
  }, [instances, selectedInstance])

  const instanceAlertCounts = useMemo(() => {
    return instances.map((instance) => ({
      instance,
      alerts: countAlerts(instance),
    }))
  }, [instances])

  if (loading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-(--color-status-exited-subtle) border border-(--color-status-exited)/30 text-(--color-status-exited) px-6 py-4 rounded-xl">
            Error: {error}
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <header className="h-20 bg-(--color-bg-surface)/80 backdrop-blur-sm border-b border-(--color-border) flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-(--color-status-warning)" />
          <div>
            <h2 className="text-2xl font-bold text-(--color-text-main)">{t('alerts')}</h2>
            <p className="text-(--color-text-muted) text-sm">{t('systemAlertsDescription')}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 bg-(--color-bg-base) space-y-8">
        {selectedInstanceData ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedInstance(null)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('backToInstances')}
                </Button>
                <div>
                  <h3 className="text-(--color-text-main) font-semibold text-lg">
                    {t('alertsOf')} {selectedInstanceData.hostname}
                  </h3>
                  <p className="text-(--color-text-muted) text-sm font-mono">{selectedInstanceData.service_id}</p>
                </div>
              </div>
              <Badge state={selectedInstanceData.status} />
            </div>
            <SystemAlerts instances={[selectedInstanceData]} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {instanceAlertCounts.map(({ instance, alerts }) => {
              const hasAlerts = alerts.total > 0

              return (
                <div
                  key={instance.service_id}
                  className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 hover:border-(--color-border-strong) transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-(--color-primary-subtle) border border-(--color-primary)/30 flex items-center justify-center">
                        <Server className="w-6 h-6 text-(--color-primary)" />
                      </div>
                      <div>
                        <h3 className="text-(--color-text-main) font-semibold">{instance.hostname}</h3>
                        <p className="text-(--color-text-muted) text-xs font-mono">{instance.service_id}</p>
                      </div>
                    </div>
                    <Badge state={instance.status} />
                  </div>

                  <div className="flex items-center gap-4 mb-5">
                    {hasAlerts ? (
                      <>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-(--color-status-exited)" />
                          <span className="text-2xl font-bold text-(--color-status-exited)">{alerts.critical}</span>
                          <span className="text-(--color-text-muted) text-xs">{t('critical')}</span>
                        </div>
                        {alerts.warning > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-(--color-status-warning)">{alerts.warning}</span>
                            <span className="text-(--color-text-muted) text-xs">{t('warning')}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-(--color-status-running)" />
                        <span className="text-(--color-status-running) font-medium text-sm">{t('noAlerts')}</span>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => setSelectedInstance(instance.service_id)}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {t('viewDetails')}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </MainLayout>
  )
}
