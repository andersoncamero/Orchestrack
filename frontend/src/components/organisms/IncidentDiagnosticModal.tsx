import { useState, useEffect, useCallback } from 'react'
import { X, Zap, Activity, Clock, Server, ArrowRight, ShieldAlert, Download, Terminal, Database, FileText } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useWebSocketContext } from '../../contexts/WebSocketContext'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'
import { Badge } from '../atoms/Badge'
import { IncidentTimeline } from '../molecules/IncidentTimeline'
import { IncidentFlowDiagram } from '../molecules/IncidentFlowDiagram'
import { TransactionImpactPanel } from './TransactionImpactPanel'
import { Spinner } from '../atoms/Spinner'
import { useAffectedTransactions } from '../../hooks/useAffectedTransactions'
import type { Incident, IncidentEvent, IncidentPropagationResponse, BlastRadius } from '../../types'

interface IncidentDiagnosticModalProps {
  incidentId: string
  deviceHostname: string
  onClose: () => void
}

export function IncidentDiagnosticModal({
  incidentId,
  deviceHostname,
  onClose,
}: IncidentDiagnosticModalProps) {
  const { t } = useLanguage()
  const { subscribe } = useWebSocketContext()
  const { token } = useAuth()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [events, setEvents] = useState<IncidentEvent[]>([])
  const [propagation, setPropagation] = useState<IncidentPropagationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const {
    transactions,
    serverTransactions,
    categoryGroups,
    totalFailed,
    loading: txLoading,
    error: txError,
    refetch: refetchTransactions,
  } = useAffectedTransactions({ incidentId, deviceId: incident?.device_id })

  const [evidence, setEvidence] = useState<any[]>([])
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<'container' | 'metrics' | 'docker'>('container')

  const loadEvidence = useCallback(async () => {
    setEvidenceLoading(true)
    try {
      const res = await api.getIncidentEvidence(incidentId)
      setEvidence(res || [])
    } catch (err) {
      console.error('Failed to load evidence', err)
    } finally {
      setEvidenceLoading(false)
    }
  }, [incidentId])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [incData, timelineRes, propagationRes] = await Promise.all([
        api.getIncidentByID(incidentId),
        api.getIncidentTimeline(incidentId),
        api.getIncidentPropagation(incidentId),
      ])
      setIncident(incData)
      setEvents(timelineRes.timeline || [])
      setPropagation(propagationRes)
    } catch (err: any) {
      setError(err.message || 'Failed to load incident diagnostic')
    } finally {
      setLoading(false)
    }
  }, [incidentId])

  useEffect(() => {
    loadData()
    loadEvidence()
  }, [loadData, loadEvidence])

  // WebSocket: actualizar datos cuando el incidente cambie
  useEffect(() => {
    if (!incident) return

    const room = `device:${incident.device_id}`
    const handleWsMessage = (msg: any) => {
      const eventType = msg?.type
      const payloadIncident = msg?.payload?.incident
      const payloadIncidentId = msg?.payload?.incident_id || payloadIncident?.id
      if (
        (eventType === 'incident.updated' || eventType === 'incident.resolved' || eventType === 'incident.propagation') &&
        payloadIncidentId === incidentId
      ) {
        loadData()
      }
      if (eventType === 'server_transaction_degraded' && payloadIncidentId === incidentId) {
        refetchTransactions()
      }
      if (eventType === 'evidence_ready' && payloadIncidentId === incidentId) {
        loadEvidence()
      }
    }

    const unsubscribe = subscribe(room, handleWsMessage)
    return () => unsubscribe()
  }, [subscribe, incident, incidentId, loadData, loadEvidence, refetchTransactions])

  // Cerrar con ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const rootCauseSeverity = incident?.severity === 'critical' ? 'exited' : 'warning'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-(--color-bg-surface) border border-(--color-border) rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--color-border)">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-(--color-status-exited-subtle) border border-(--color-status-exited)/30 flex items-center justify-center">
              <Activity className="w-5 h-5 text-(--color-status-exited)" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-(--color-text-main)">
                {t('incidentDiagnostic')}
              </h2>
              <div className="flex items-center gap-2 text-sm text-(--color-text-muted)">
                <Server className="w-3.5 h-3.5" />
                <span>{deviceHostname}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-(--color-text-muted) hover:text-(--color-text-main) hover:bg-(--color-bg-base) transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}

          {error && (
            <div className="bg-(--color-status-exited-subtle) border border-(--color-status-exited)/30 text-(--color-status-exited) px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {!loading && incident && (
            <>
              {/* Causa Raíz Destacada */}
              <div
                className={`rounded-xl border p-4 ${
                  rootCauseSeverity === 'exited'
                    ? 'border-(--color-status-exited)/40 bg-(--color-status-exited-subtle)'
                    : 'border-(--color-status-warning)/40 bg-(--color-status-warning-subtle)'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Zap className={`w-5 h-5 ${rootCauseSeverity === 'exited' ? 'text-(--color-status-exited)' : 'text-(--color-status-warning)'}`} />
                  <span className={`text-sm font-bold uppercase tracking-wide ${rootCauseSeverity === 'exited' ? 'text-(--color-status-exited)' : 'text-(--color-status-warning)'}`}>
                    {t('rootCauseTrigger')}
                  </span>
                  <Badge state={incident.status === 'open' ? 'running' : 'exited'} />
                </div>
                <p className="text-(--color-text-main) font-semibold text-base">
                  {t('origin')}: {incident.root_cause_type} {t('inHost')} [{deviceHostname}]
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Clock className="w-3.5 h-3.5 text-(--color-text-muted)" />
                  <span className="text-xs text-(--color-text-muted)">
                    {new Date(incident.started_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Blast Radius */}
              {propagation?.blast_radius && (
                <div>
                  <h3 className="text-sm font-bold text-(--color-text-main) uppercase tracking-wide mb-3">
                    {t('blastRadius')}
                  </h3>
                  <div className="bg-(--color-bg-base) border border-(--color-border) rounded-xl p-4">
                    <BlastRadiusPanel radius={propagation.blast_radius} />
                  </div>
                </div>
              )}

              {/* Transacciones y Servicios Afectados (T-021) */}
              <div>
                <h3 className="text-sm font-bold text-(--color-text-main) uppercase tracking-wide mb-3">
                  {t('affectedTransactionsAndServices')}
                </h3>
                <TransactionImpactPanel
                  transactionsData={{
                    incident_id: incidentId,
                    total_failed: totalFailed,
                    affected_devices: events.length,
                    categories: categoryGroups,
                    transactions,
                  }}
                  serverTransactionsData={{
                    incident_id: incidentId,
                    total_records: serverTransactions.length,
                    records: serverTransactions,
                  }}
                  loading={txLoading}
                  error={txError}
                />
              </div>

              {/* Evidencia que lo Respalda (T-025) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-(--color-text-main) uppercase tracking-wide flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-(--color-status-warning)" />
                    {t('backingEvidence')}
                  </h3>
                  {evidence.length > 0 && (
                    <button
                      onClick={async () => {
                        try {
                          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
                          const response = await fetch(`${API_URL}/api/v1/incidents/${incidentId}/evidence/export`, {
                            headers: {
                              'Authorization': token || '',
                            }
                          });
                          if (!response.ok) throw new Error('Failed to export evidence');
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `incident_evidence_${incidentId}.zip`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs bg-(--color-bg-surface) hover:bg-(--color-bg-base) text-(--color-text-main) border border-(--color-border) px-3 py-1.5 rounded-lg transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {t('exportForensicBundle')}
                    </button>
                  )}
                </div>

                <div className="bg-(--color-bg-base) border border-(--color-border) rounded-xl p-5">
                  {evidenceLoading ? (
                    <div className="flex flex-col items-center justify-center py-6 text-(--color-text-muted) text-sm gap-2">
                      <Spinner className="w-5 h-5 text-(--color-text-main)" />
                      <span>Cargando evidencia forense...</span>
                    </div>
                  ) : evidence.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-(--color-text-muted) text-sm border border-dashed border-(--color-border) rounded-lg bg-(--color-bg-surface)">
                      <div className="relative mb-2">
                        <ShieldAlert className="w-8 h-8 text-(--color-text-muted) animate-pulse" />
                      </div>
                      <span className="font-semibold text-(--color-text-main) mb-1">{t('waitingForEvidence')}</span>
                      <span className="text-xs max-w-xs">{t('noEvidenceAvailable')}</span>
                    </div>
                  ) : (
                    <div>
                      {/* Tabs */}
                      <div className="flex border-b border-(--color-border) mb-4">
                        <button
                          onClick={() => setActiveEvidenceTab('container')}
                          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                            activeEvidenceTab === 'container'
                              ? 'border-(--color-text-main) text-(--color-text-main)'
                              : 'border-transparent text-(--color-text-muted) hover:text-(--color-text-main)'
                          }`}
                        >
                          <Terminal className="w-3.5 h-3.5" />
                          {t('containerLogs')}
                        </button>
                        <button
                          onClick={() => setActiveEvidenceTab('metrics')}
                          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                            activeEvidenceTab === 'metrics'
                              ? 'border-(--color-text-main) text-(--color-text-main)'
                              : 'border-transparent text-(--color-text-muted) hover:text-(--color-text-main)'
                          }`}
                        >
                          <Database className="w-3.5 h-3.5" />
                          {t('hostMetricsSnapshot')}
                        </button>
                        <button
                          onClick={() => setActiveEvidenceTab('docker')}
                          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                            activeEvidenceTab === 'docker'
                              ? 'border-(--color-text-main) text-(--color-text-main)'
                              : 'border-transparent text-(--color-text-muted) hover:text-(--color-text-main)'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {t('systemEventsDockerLogs')}
                        </button>
                      </div>

                      {/* Tab Content */}
                      <div className="bg-black text-slate-100 rounded-lg p-4 font-mono text-xs overflow-auto max-h-[300px] border border-slate-800">
                        {(() => {
                          const rawPayload = evidence[0]?.payload_json;
                          let parsed: any = {};
                          try {
                            parsed = JSON.parse(rawPayload || '{}');
                          } catch (_) {}

                          if (activeEvidenceTab === 'container') {
                            return parsed.container_logs ? (
                              <pre className="whitespace-pre-wrap leading-relaxed select-text">{parsed.container_logs}</pre>
                            ) : (
                              <span className="text-slate-500 italic">No hay logs de contenedor disponibles.</span>
                            );
                          } else if (activeEvidenceTab === 'docker') {
                            return parsed.docker_logs ? (
                              <pre className="whitespace-pre-wrap leading-relaxed select-text">{parsed.docker_logs}</pre>
                            ) : (
                              <span className="text-slate-500 italic">No hay logs de Docker Daemon disponibles.</span>
                            );
                          } else {
                            if (!parsed.host_metrics) {
                              return <span className="text-slate-500 italic">No hay snapshot de métricas del host disponible.</span>;
                            }
                            const hm = parsed.host_metrics;
                            return (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-slate-300">
                                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                                    <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">CPU Usage</div>
                                    <div className="text-sm font-bold text-white">{hm.cpu_percent?.toFixed(1)}%</div>
                                    <div className="text-[10px] text-slate-400 mt-1">{hm.cpu_cores} Cores</div>
                                  </div>
                                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                                    <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Memory Percent</div>
                                    <div className="text-sm font-bold text-white">{hm.memory_percent?.toFixed(1)}%</div>
                                    <div className="text-[10px] text-slate-400 mt-1">{(hm.memory_used / 1024 / 1024 / 1024).toFixed(1)} GB / {(hm.memory_total / 1024 / 1024 / 1024).toFixed(1)} GB</div>
                                  </div>
                                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                                    <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Disk Percent</div>
                                    <div className="text-sm font-bold text-white">{hm.disk_percent?.toFixed(1)}%</div>
                                    <div className="text-[10px] text-slate-400 mt-1">{(hm.disk_used / 1024 / 1024 / 1024).toFixed(1)} GB / {(hm.disk_total / 1024 / 1024 / 1024).toFixed(1)} GB</div>
                                  </div>
                                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                                    <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">System Load</div>
                                    <div className="text-sm font-bold text-white">{hm.load_average?.toFixed(2)}</div>
                                    <div className="text-[10px] text-slate-400 mt-1">{hm.process_count} Processes</div>
                                  </div>
                                </div>

                                {hm.processes && hm.processes.length > 0 && (
                                  <div>
                                    <div className="text-[10px] uppercase text-slate-500 font-bold mb-2 tracking-wider">Top Processes at Failure Time</div>
                                    <div className="border border-slate-800 rounded-lg overflow-hidden">
                                      <table className="w-full text-left text-[11px]">
                                        <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                                          <tr>
                                            <th className="p-2">PID</th>
                                            <th className="p-2">Name</th>
                                            <th className="p-2 text-right">CPU %</th>
                                            <th className="p-2 text-right">MEM %</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-900 bg-slate-950/30">
                                          {hm.processes.slice(0, 5).map((p: any) => (
                                            <tr key={p.pid} className="hover:bg-slate-900/40 text-slate-300">
                                              <td className="p-2 font-mono text-slate-500">{p.pid}</td>
                                              <td className="p-2 font-semibold text-white truncate max-w-[120px]">{p.name}</td>
                                              <td className="p-2 text-right text-emerald-400">{p.cpu_percent?.toFixed(1)}%</td>
                                              <td className="p-2 text-right text-sky-400">{p.memory_percent?.toFixed(1)}%</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mapa de Propagación */}
              {propagation && propagation.propagations.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-(--color-text-main) uppercase tracking-wide mb-3">
                    {t('propagationMap')}
                  </h3>
                  <div className="bg-(--color-bg-base) border border-(--color-border) rounded-xl p-4">
                    <PropagationMapPanel propagations={propagation.propagations} />
                  </div>
                </div>
              )}

              {/* Diagrama de Flujo */}
              <div>
                <h3 className="text-sm font-bold text-(--color-text-main) uppercase tracking-wide mb-3">
                  {t('propagation')}
                </h3>
                <div className="bg-(--color-bg-base) border border-(--color-border) rounded-xl p-4">
                  <IncidentFlowDiagram incident={incident} events={events} />
                </div>
              </div>

              {/* Línea de Tiempo */}
              <div>
                <h3 className="text-sm font-bold text-(--color-text-main) uppercase tracking-wide mb-3">
                  {t('timeline')}
                </h3>
                <div className="bg-(--color-bg-base) border border-(--color-border) rounded-xl p-4">
                  <IncidentTimeline events={events} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-(--color-border) flex items-center justify-between">
          <span className="text-xs text-(--color-text-muted)">
            ID: <span className="font-mono">{incidentId}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-(--color-bg-base) border border-(--color-border) text-(--color-text-main) text-sm font-medium hover:bg-(--color-border) transition-colors"
          >
            {t('closeDiagnostic')}
          </button>
        </div>
      </div>
    </div>
  )
}

// Sub-componente: Blast Radius
function BlastRadiusPanel({ radius }: { radius: BlastRadius }) {
  const { t } = useLanguage()

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-(--color-status-exited-subtle) border border-(--color-status-exited)/30 rounded-xl p-4 text-center">
        <p className="text-2xl font-bold text-(--color-status-exited)">{radius.affected_devices}</p>
        <p className="text-xs text-(--color-text-muted) mt-1">{t('affectedServers')}</p>
      </div>
      <div className="bg-(--color-status-warning-subtle) border border-(--color-status-warning)/30 rounded-xl p-4 text-center">
        <p className="text-2xl font-bold text-(--color-status-warning)">{radius.affected_containers}</p>
        <p className="text-xs text-(--color-text-muted) mt-1">{t('affectedContainers')}</p>
      </div>
      <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-4 text-center">
        <p className="text-2xl font-bold text-(--color-text-main)">{radius.total_devices}</p>
        <p className="text-xs text-(--color-text-muted) mt-1">{t('totalCluster')}</p>
      </div>
      <div className="bg-(--color-primary-subtle) border border-(--color-primary)/30 rounded-xl p-4 text-center">
        <p className="text-2xl font-bold text-(--color-primary)">{radius.propagation_depth}</p>
        <p className="text-xs text-(--color-text-muted) mt-1">{t('propagationDepth')}</p>
      </div>
    </div>
  )
}

// Sub-componente: Mapa de Propagación
function PropagationMapPanel({ propagations }: { propagations: import('../../types').IncidentPropagation[] }) {
  const { t } = useLanguage()

  return (
    <div className="space-y-3">
      {propagations.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-3 bg-(--color-bg-surface) border border-(--color-border) rounded-xl px-4 py-3"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Server className="w-4 h-4 text-(--color-primary) shrink-0" />
            <span className="text-xs text-(--color-text-muted) uppercase">{t('from')}</span>
            <span className="text-sm font-semibold text-(--color-text-main) truncate">
              {p.from_hostname || p.from_device_id}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ArrowRight className="w-4 h-4 text-(--color-border-strong)" />
            <span className="text-xs text-(--color-text-muted)">+{p.time_delta_sec}s</span>
            <ArrowRight className="w-4 h-4 text-(--color-border-strong)" />
          </div>
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
            <span className="text-xs text-(--color-text-muted) uppercase">{t('to')}</span>
            <span className="text-sm font-semibold text-(--color-text-main) truncate">
              {p.to_hostname || p.to_device_id}
            </span>
            <Server className="w-4 h-4 text-(--color-status-exited) shrink-0" />
          </div>
        </div>
      ))}
    </div>
  )
}
