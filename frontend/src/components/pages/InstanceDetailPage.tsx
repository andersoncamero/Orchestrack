import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Server } from 'lucide-react'
import { MainLayout } from '../templates/MainLayout'
import { Spinner } from '../atoms/Spinner'
import { Badge } from '../atoms/Badge'
import { DeviceConnectionHistoryChart } from '../organisms/DeviceConnectionHistoryChart'
import type { TimeRange } from '../organisms/DeviceConnectionHistoryChart'
import { ResourceBarChart } from '../organisms/ResourceBarChart'
import { InstanceAlertsTable } from '../organisms/InstanceAlertsTable'
import { NetworkMetricsChart } from '../organisms/NetworkMetricsChart'
import { useInstances } from '../../hooks/useInstances'
import { useState, useMemo, useEffect } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useConnectionHistory } from '../../hooks/useConnectionHistory'
import { useNetworkMetrics } from '../../hooks/useNetworkMetrics'
import { formatBytes, formatDuration, timeAgo } from '../../utils/time'
import type { Instance, ConnectionHistorySample, DeviceConnectionEvent } from '../../types'

export default function InstanceDetailPage() {
  const { service_id } = useParams<{ service_id: string }>()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { instances, loading: loadingInstances } = useInstances()
  const { history: netHistory, latestMetrics: netLatest, loading: loadingNet } = useNetworkMetrics(service_id)
  
  const [localInstance, setLocalInstance] = useState<Instance | null>(null)
  const [range, setRange] = useState<TimeRange>('24h')
  
  const hours = useMemo(() => {
    switch (range) {
      case '24h':
        return 24
      case '7d':
        return 168
      case '30d':
        return 720
      default:
        return 24
    }
  }, [range])

  const { samples, events: historyEvents, loading: loadingHistory } = useConnectionHistory(hours, service_id || '')

  const [localSamples, setLocalSamples] = useState<ConnectionHistorySample[]>([])
  const [localEvents, setLocalEvents] = useState<DeviceConnectionEvent[]>([])

  useEffect(() => {
    if (samples) {
      setLocalSamples(samples)
    }
  }, [samples])

  useEffect(() => {
    if (historyEvents) {
      setLocalEvents(historyEvents)
    }
  }, [historyEvents])

  useEffect(() => {
    const found = instances.find((i) => i.service_id === service_id)
    if (found) {
      setLocalInstance(found)
    }
  }, [instances, service_id])

  // Suscribirse a actualizaciones de métricas y estado del host de esta máquina específica
  useWebSocket({
    room: `device:${service_id}`,
    onMessage: (message) => {
      if (message.payload?.service_id === service_id) {
        const ts = message.payload.last_seen || Math.floor(Date.now() / 1000)

        if (message.type === 'instance.offline' || message.type === 'instance.online') {
          const isOnline = message.type === 'instance.online'

          // Actualizar estado de la instancia en memoria
          setLocalInstance((prev) => {
            const current = prev || instances.find((i) => i.service_id === service_id)
            if (!current) return null
            return {
              ...current,
              status: isOnline ? 'online' : 'offline',
              last_seen: ts,
            }
          })

          // Inyectar el nuevo evento de conexión localmente (0 peticiones HTTP)
          const newEvent: DeviceConnectionEvent = {
            type: message.type,
            timestamp: ts,
          }
          setLocalEvents((prev) => {
            const filtered = prev.filter((e) => e.timestamp !== ts)
            return [newEvent, ...filtered].sort((a, b) => b.timestamp - a.timestamp)
          })

          // Inyectar la muestra de conectividad localmente
          const newSample: ConnectionHistorySample = {
            timestamp: ts,
            online: isOnline ? 1 : 0,
            offline: isOnline ? 0 : 1,
            total: 1,
          }
          setLocalSamples((prev) => {
            const limit = Math.floor(Date.now() / 1000) - hours * 3600
            const filtered = prev.filter((s) => s.timestamp !== ts && s.timestamp >= limit)
            return [...filtered, newSample].sort((a, b) => a.timestamp - b.timestamp)
          })

        } else if (message.type === 'heartbeat') {
          // El heartbeat indica que la máquina está online. Actualizamos métricas en memoria.
          setLocalInstance((prev) => {
            const current = prev || instances.find((i) => i.service_id === service_id)
            if (!current) return null
            return {
              ...current,
              status: 'online',
              last_seen: ts,
              host_metrics: message.payload.host_metrics || current.host_metrics,
            }
          })

          // Inyectar la muestra del heartbeat como online localmente
          const newSample: ConnectionHistorySample = {
            timestamp: ts,
            online: 1,
            offline: 0,
            total: 1,
          }
          setLocalSamples((prev) => {
            const limit = Math.floor(Date.now() / 1000) - hours * 3600
            const filtered = prev.filter((s) => s.timestamp !== ts && s.timestamp >= limit)
            return [...filtered, newSample].sort((a, b) => a.timestamp - b.timestamp)
          })
        }
      }
    }
  })



  const instance = localInstance || instances.find((i) => i.service_id === service_id)

  if (loadingInstances) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </MainLayout>
    )
  }

  if (!instance) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-rose-500/10 border border-rose-500/30 text-(--color-status-exited) px-6 py-4 rounded-xl">
            {t('instanceNotFound')}
          </div>
        </div>
      </MainLayout>
    )
  }

  const metrics = instance.host_metrics

  return (
    <MainLayout>
      <header className="h-20 bg-(--color-bg-surface)/80 backdrop-blur-sm border-b border-(--color-border) flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 bg-(--color-bg-surface) hover:bg-(--color-bg-surface-hover) text-(--color-text-secondary) rounded-lg transition-colors border border-(--color-border)"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-(--color-primary-subtle) border border-(--color-primary)/30 flex items-center justify-center">
              <Server className="w-5 h-5 text-(--color-primary)" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-(--color-text-main)">{instance.hostname}</h2>
              <p className="text-(--color-text-muted) text-sm">{t('serviceID')}: {instance.service_id}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-(--color-text-muted) text-xs">{t('uptime')}</p>
            <p className="text-(--color-text-main) font-semibold">{metrics ? formatDuration(metrics.uptime_seconds) : '-'}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge state={instance.status} />
            <span className="text-(--color-text-muted) text-sm">{timeAgo(instance.last_seen)}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 bg-(--color-bg-base) space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5">
            <p className="text-(--color-text-muted) text-xs font-medium uppercase tracking-wider">{t('platform')}</p>
            <p className="text-xl font-bold text-(--color-text-main) mt-1">{metrics?.platform || '-'}</p>
          </div>
          <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5">
            <p className="text-(--color-text-muted) text-xs font-medium uppercase tracking-wider">{t('cpuCores')}</p>
            <p className="text-xl font-bold text-(--color-text-main) mt-1">{metrics?.cpu_cores || '-'}</p>
          </div>
          <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5">
            <p className="text-(--color-text-muted) text-xs font-medium uppercase tracking-wider">{t('memory')}</p>
            <p className="text-xl font-bold text-(--color-text-main) mt-1">
              {metrics ? formatBytes(metrics.memory_total) : '-'}
            </p>
          </div>
        </div>

        {/* Connection History */}
        <DeviceConnectionHistoryChart
          samples={localSamples}
          events={localEvents}
          loading={loadingHistory}
          range={range}
          onRangeChange={setRange}
          currentStatus={instance.status}
        />

        {/* Network Metrics & RTT Latency Section (DoD T-009) */}
        <NetworkMetricsChart
          metrics={netHistory}
          loading={loadingNet}
          latestRttMs={netLatest?.rtt_ms || metrics?.rtt_ms || 0}
          latestRxBytesPerSec={netLatest?.rx_bytes_per_sec || metrics?.rx_bytes_per_sec || 0}
          latestTxBytesPerSec={netLatest?.tx_bytes_per_sec || metrics?.tx_bytes_per_sec || 0}
        />

        {/* Alerts & Resource Usage Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InstanceAlertsTable instance={instance} />
          <ResourceBarChart metrics={metrics} />
        </div>
      </main>
    </MainLayout>
  )
}
