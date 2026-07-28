import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Cpu, HardDrive, Key, MemoryStick, Play, Server, Square } from 'lucide-react'
import { MainLayout } from '../templates/MainLayout'
import { Spinner } from '../atoms/Spinner'
import { Badge } from '../atoms/Badge'
import { ToastContainer, useToast } from '../atoms/Toast'
import { useInstances } from '../../hooks/useInstances'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useLanguage } from '../../contexts/LanguageContext'
import { api } from '../../services/api'
import { formatBytes, timeAgo } from '../../utils/time'
import { UserNavActions } from '../molecules/UserNavActions'

export default function InstancesPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { instances, loading: loadingInstances, refetch } = useInstances()
  const { toasts, addToast, removeToast } = useToast()
  const [stats, setStats] = useState<Record<string, { total: number; running: number; stopped: number }>>({})

  // Estados para el Modal de Agregar Dispositivo
  const [showAddModal, setShowAddModal] = useState(false)
  const [tokenData, setTokenData] = useState<{ token: string; expires_at: string } | null>(null)
  const [generatingToken, setGeneratingToken] = useState(false)
  const [copied, setCopied] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  // Escuchar eventos de dispositivos via WebSocket para refrescar sin polling
  const handleWsMessage = useCallback((data: { type?: string; payload?: any }) => {
    const deviceEvents = ['device.registered_pending', 'device.approved', 'instance.offline', 'instance.online']
    if (data?.type && deviceEvents.includes(data.type)) {
      refetch(true)
      if (data.type === 'device.registered_pending') {
        addToast('Nuevo dispositivo pendiente de aprobación', 'info')
      } else if (data.type === 'device.approved') {
        addToast('Dispositivo aprobado y activo', 'success')
      }
    } else if (data?.type === 'instance.containers_updated' && data.payload) {
      const { service_id, total, running, stopped } = data.payload
      setStats((prev) => ({
        ...prev,
        [service_id]: { total, running, stopped }
      }))
    }
  }, [refetch, addToast])

  useWebSocket({ room: 'dashboard', onMessage: handleWsMessage })

  useEffect(() => {
    const newStats: Record<string, { total: number; running: number; stopped: number }> = {}
    instances.forEach((instance) => {
      newStats[instance.service_id] = {
        total: instance.total_containers ?? 0,
        running: instance.running_containers ?? 0,
        stopped: instance.stopped_containers ?? 0,
      }
    })
    setStats(newStats)
  }, [instances])

  const handleApprove = async (serviceId: string) => {
    setApprovingId(serviceId)
    try {
      await api.approveDevice(serviceId)
      addToast('Dispositivo aprobado exitosamente', 'success')
      await refetch(true)
    } catch (err) {
      console.error(err)
      addToast(err instanceof Error ? err.message : 'Error al aprobar el dispositivo', 'error')
    } finally {
      setApprovingId(null)
    }
  }

  const handleGenerateToken = async () => {
    setGeneratingToken(true)
    try {
      const data = await api.generateRegistrationToken()
      setTokenData(data)
    } catch (err) {
      console.error(err)
      addToast(err instanceof Error ? err.message : 'Error al generar el token de registro', 'error')
    } finally {
      setGeneratingToken(false)
    }
  }

  if (loadingInstances) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </MainLayout>
    )
  }

  return (
    <>
      <MainLayout>
      <header className="h-20 bg-(--color-bg-surface)/80 backdrop-blur-sm border-b border-(--color-border) flex items-center justify-between px-8 sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-bold text-(--color-text-main)">{t('instances')}</h2>
          <p className="text-(--color-text-muted) text-sm">{t('registeredHosts')}</p>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-(--color-primary) hover:bg-(--color-primary-hover) text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all cursor-pointer"
          >
            <Server className="w-5 h-5" />
            {t('addDevice')}
          </button>
          <UserNavActions />
        </div>
      </header>

      <main className="flex-1 p-8 bg-(--color-bg-base)">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {instances.map((instance) => {
            const s = stats[instance.service_id]
            const isPending = instance.status === 'pending'
            return (
              <div
                key={instance.service_id}
                className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6 hover:border-(--color-border-strong) transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-(--color-primary-subtle) border border-(--color-primary)/30 flex items-center justify-center">
                        <Server className="w-6 h-6 text-(--color-primary)" />
                      </div>
                      <div>
                        <h3 className="text-(--color-text-main) font-semibold text-lg">{instance.hostname}</h3>
                        <p className="text-(--color-text-muted) text-sm font-mono">{instance.service_id}</p>
                      </div>
                    </div>
                    <Badge state={instance.status} />
                  </div>

                  {!isPending && (
                    <>
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-(--color-bg-base)/50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-(--color-text-main)">{s?.total ?? 0}</p>
                          <p className="text-xs text-(--color-text-muted)">{t('totalContainers')}</p>
                        </div>
                        <div className="bg-(--color-bg-base)/50 rounded-lg p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Play className="w-4 h-4 text-(--color-status-running)" />
                            <p className="text-2xl font-bold text-(--color-status-running)">{s?.running ?? 0}</p>
                          </div>
                          <p className="text-xs text-(--color-text-muted)">{t('running')}</p>
                        </div>
                        <div className="bg-(--color-bg-base)/50 rounded-lg p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Square className="w-4 h-4 text-(--color-status-exited)" />
                            <p className="text-2xl font-bold text-(--color-status-exited)">{s?.stopped ?? 0}</p>
                          </div>
                          <p className="text-xs text-(--color-text-muted)">{t('stopped')}</p>
                        </div>
                      </div>

                      {instance.host_metrics && (
                        <div className="grid grid-cols-3 gap-3 mb-6">
                          <div className="bg-bg-base/50 rounded-lg p-2.5">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Cpu className="w-3.5 h-3.5 text-(--color-primary)" />
                              <span className="text-(--color-text-muted) text-xs">CPU</span>
                            </div>
                            <p className="text-(--color-text-main) font-semibold text-sm">{instance.host_metrics.cpu_percent?.toFixed(1)}%</p>
                          </div>
                          <div className="bg-(--color-bg-base)/50 rounded-lg p-2.5">
                            <div className="flex items-center gap-1.5 mb-1">
                              <MemoryStick className="w-3.5 h-3.5 text-(--color-status-running)" />
                              <span className="text-(--color-text-muted) text-xs">RAM</span>
                            </div>
                            <p className="text-(--color-text-main) font-semibold text-sm">{instance.host_metrics.memory_percent?.toFixed(1)}%</p>
                            <p className="text-(--color-text-muted) text-[10px]">{formatBytes(instance.host_metrics.memory_used)}</p>
                          </div>
                          <div className="bg-(--color-bg-base)/50 rounded-lg p-2.5">
                            <div className="flex items-center gap-1.5 mb-1">
                              <HardDrive className="w-3.5 h-3.5 text-(--color-status-info)" />
                              <span className="text-(--color-text-muted) text-xs">Disco</span>
                            </div>
                            <p className="text-(--color-text-main) font-semibold text-sm">{instance.host_metrics.disk_percent?.toFixed(1)}%</p>
                            <p className="text-(--color-text-muted) text-[10px]">{formatBytes(instance.host_metrics.disk_used)}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {isPending && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 text-center">
                      <p className="text-amber-500 text-sm font-medium mb-1">
                        {t('statePending')}
                      </p>
                      <p className="text-(--color-text-muted) text-xs">
                        {t('addDeviceDescription')}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-(--color-text-muted) text-sm">
                    {isPending ? t('statePending') : `${t('lastHeartbeat')}: ${timeAgo(instance.last_seen)}`}
                  </span>
                  {isPending ? (
                    <button
                      onClick={() => handleApprove(instance.service_id)}
                      disabled={approvingId === instance.service_id}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {approvingId === instance.service_id ? (
                        <>
                          <Spinner size="sm" />
                          {t('approving')}
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-white" />
                          {t('approve')}
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/instances/${instance.service_id}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-(--color-bg-surface-hover) hover:bg-(--color-border) text-(--color-text-main) text-sm font-medium rounded-lg transition-colors cursor-pointer"
                    >
                      {t('viewDetails')}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Modal Agregar Dispositivo */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div
            className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            {/* Accent glow en la parte superior */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, var(--color-primary), transparent)' }}
            />

            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-start gap-4">
              <div
                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)' }}
              >
                <Server className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-main)' }}>
                  {t('addDevice')}
                </h3>
                <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {t('addDeviceDescription')}
                </p>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setTokenData(null) }}
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-main)'; (e.currentTarget as HTMLElement).style.background = 'var(--color-border)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Divider */}
            <div className="h-px mx-6" style={{ background: 'var(--color-border)' }} />

            {/* Content */}
            <div className="px-6 py-5">
              {!tokenData ? (
                /* Estado: Sin token - Panel de instrucciones */
                <div className="space-y-5">
                  {/* Pasos */}
                  <div className="space-y-3">
                    {[
                      { step: '1', text: 'Genera un token de registro único para este dispositivo.' },
                      { step: '2', text: 'Copia el comando y ejecútalo en la terminal del dispositivo.' },
                      { step: '3', text: 'El dispositivo aparecerá como pendiente. Apruébalo desde la lista.' },
                    ].map(({ step, text }) => (
                      <div key={step} className="flex items-start gap-3">
                        <span
                          className="flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5"
                          style={{ background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', color: 'var(--color-primary)', border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)' }}
                        >
                          {step}
                        </span>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{text}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleGenerateToken}
                    disabled={generatingToken}
                    className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                    style={{ background: 'var(--color-primary)' }}
                    onMouseEnter={e => { if (!generatingToken) (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-hover)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-primary)' }}
                  >
                    {generatingToken ? (
                      <>
                        <Spinner size="sm" />
                        {t('generatingToken')}
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        {t('generateRegistrationToken')}
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Estado: Token generado */
                <div className="space-y-4">
                  {/* Token */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                        {t('registrationToken')}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.25)' }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                        Expira en 24 h · Un solo uso
                      </span>
                    </div>
                    <div
                      className="rounded-xl p-3 font-mono text-sm break-all select-all"
                      style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}
                    >
                      {tokenData.token}
                    </div>
                  </div>

                  {/* Comando */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                        {t('runCommandOnDevice')}
                      </span>
                    </div>

                    {/* Terminal */}
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                      {/* Barra de título del terminal */}
                      <div className="flex items-center gap-1.5 px-4 py-2.5" style={{ background: '#1a1a2e', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <span className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                        <span className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
                        <span className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
                        <span className="ml-2 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>bash</span>
                      </div>
                      {/* Cuerpo del terminal */}
                      <div className="relative p-4" style={{ background: '#0d0d1a' }}>
                        <pre className="text-xs leading-relaxed pr-20 overflow-x-auto whitespace-pre-wrap break-all" style={{ color: '#34d399', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
                          <span style={{ color: 'rgba(255,255,255,0.3)' }}>$ </span>
                          {`AGENT_TOKEN="${tokenData.token}" \\\n  BACKEND_URL="${import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8080`}" \\\n  NATS_URL="nats://${window.location.hostname}:4222" \\\n  ./orchestrack-agent`}
                        </pre>
                        <button
                          onClick={() => {
                            const cmd = `AGENT_TOKEN="${tokenData.token}" BACKEND_URL="${import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8080`}" NATS_URL="nats://${window.location.hostname}:4222" ./orchestrack-agent`
                            navigator.clipboard.writeText(cmd)
                            setCopied(true)
                            setTimeout(() => setCopied(false), 2000)
                          }}
                          className="absolute right-3 top-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                          style={{
                            background: copied ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255,255,255,0.08)',
                            color: copied ? '#34d399' : 'rgba(255,255,255,0.6)',
                            border: copied ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(255,255,255,0.1)',
                          }}
                        >
                          {copied ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                              {t('copied')}
                            </>
                          ) : (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                              </svg>
                              {t('copy')}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {tokenData && (
              <>
                <div className="h-px mx-6" style={{ background: 'var(--color-border)' }} />
                <div className="px-6 py-4 flex items-center justify-between">
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    El dispositivo aparecerá como <span style={{ color: '#f59e0b' }}>pendiente</span> hasta que lo apruebes.
                  </p>
                  <button
                    onClick={() => { setShowAddModal(false); setTokenData(null) }}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    style={{ color: 'var(--color-text-main)', background: 'var(--color-bg-surface-hover)', border: '1px solid var(--color-border)' }}
                  >
                    {t('close')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </MainLayout>

    {/* Toasts de notificaciones */}
    <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}
