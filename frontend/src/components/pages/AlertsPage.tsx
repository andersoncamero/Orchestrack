import { useMemo, useState } from 'react'
import { Bell, Server, AlertTriangle, CheckCircle2, Eye, ArrowLeft, Activity, Zap } from 'lucide-react'
import { MainLayout } from '../templates/MainLayout'
import { Spinner } from '../atoms/Spinner'
import { UserNavActions } from '../molecules/UserNavActions'
import { Badge } from '../atoms/Badge'
import { Button } from '../atoms/Button'
import { SystemAlerts } from '../organisms/SystemAlerts'
import { IncidentDiagnosticModal } from '../organisms/IncidentDiagnosticModal'
import { useInstances } from '../../hooks/useInstances'
import { useIncidents } from '../../hooks/useIncidents'
import { useLanguage } from '../../contexts/LanguageContext'
import type { Instance, Incident } from '../../types'

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

function IncidentRow({
  incident,
  hostname,
  onViewDiagnostic,
}: {
  incident: Incident
  hostname: string
  onViewDiagnostic: (incident: Incident) => void
}) {
  const { t } = useLanguage()
  const severityColor = incident.severity === 'critical' ? 'text-(--color-status-exited)' : 'text-(--color-status-warning)'
  const bgColor = incident.severity === 'critical' ? 'bg-(--color-status-exited-subtle)' : 'bg-(--color-status-warning-subtle)'
  const borderColor = incident.severity === 'critical' ? 'border-(--color-status-exited)/30' : 'border-(--color-status-warning)/30'

  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border ${borderColor} ${bgColor}`}>
      <div className={`w-10 h-10 rounded-lg bg-(--color-bg-surface) border border-(--color-border) flex items-center justify-center shrink-0`}>
        <Zap className={`w-5 h-5 ${severityColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-(--color-text-main) font-semibold text-sm truncate">{incident.title}</p>
          <Badge state={incident.status === 'open' ? 'running' : 'exited'} />
        </div>
        <p className="text-xs text-(--color-text-muted) mt-0.5">
          {t('rootCause')}: <span className={severityColor}>{incident.root_cause_type}</span> · {hostname}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-(--color-text-muted)">
            {new Date(incident.started_at).toLocaleString()}
          </span>
          <button
            onClick={() => onViewDiagnostic(incident)}
            className="text-xs font-medium text-(--color-primary) hover:text-(--color-primary-hover) transition-colors flex items-center gap-1"
          >
            <Activity className="w-3.5 h-3.5" />
            {t('viewDiagnostic')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AlertsPage() {
  const { t } = useLanguage()
  const { instances, loading: instancesLoading, error: instancesError } = useInstances()
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)

  const selectedInstanceData = useMemo(() => {
    return instances.find((i) => i.service_id === selectedInstance) || null
  }, [instances, selectedInstance])

  const instanceAlertCounts = useMemo(() => {
    return instances.map((instance) => ({
      instance,
      alerts: countAlerts(instance),
    }))
  }, [instances])

  // Cargar incidentes: globales si no hay instancia seleccionada, o filtrados por instancia
  const deviceIdForIncidents = selectedInstanceData?.service_id || undefined
  const {
    incidents,
    loading: incidentsLoading,
  } = useIncidents({ deviceId: deviceIdForIncidents, status: 'open', limit: 50 })

  const openDiagnostic = (incident: Incident) => {
    setSelectedIncident(incident)
  }

  const closeDiagnostic = () => {
    setSelectedIncident(null)
  }

  const getHostnameForIncident = (incident: Incident): string => {
    const inst = instances.find((i) => i.service_id === incident.device_id)
    return inst?.hostname || incident.device_id
  }

  const loading = instancesLoading
  const error = instancesError

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
        <UserNavActions />
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

            {/* Incidentes de la instancia seleccionada */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Activity className="w-5 h-5 text-(--color-status-exited)" />
                <h3 className="text-(--color-text-main) font-semibold text-lg">
                  {t('incidents')} ({incidents.length})
                </h3>
              </div>
              {incidentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner size="md" />
                </div>
              ) : incidents.length === 0 ? (
                <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6 text-center text-(--color-text-muted) text-sm">
                  {t('noIncidents')}
                </div>
              ) : (
                <div className="space-y-3">
                  {incidents.map((incident) => (
                    <IncidentRow
                      key={incident.id}
                      incident={incident}
                      hostname={selectedInstanceData.hostname}
                      onViewDiagnostic={openDiagnostic}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </main>

      {/* Modal de Diagnóstico */}
      {selectedIncident && (
        <IncidentDiagnosticModal
          incidentId={selectedIncident.id}
          deviceHostname={getHostnameForIncident(selectedIncident)}
          onClose={closeDiagnostic}
        />
      )}
    </MainLayout>
  )
}
