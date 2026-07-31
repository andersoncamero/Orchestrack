import { X, Server, Cpu, MemoryStick, HardDrive, Activity, Network } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useInstances } from '../../hooks/useInstances'
import { timeAgo } from '../../utils/time'
import { bytes } from '../../utils/bytes'
import type { TopologyNode } from '../../hooks/useTopology'

interface TopologyNodeDetailProps {
  node: TopologyNode
  onClose: () => void
  onShowNetwork?: () => void
}

export function TopologyNodeDetail({ node, onClose, onShowNetwork }: TopologyNodeDetailProps) {
  const { t } = useLanguage()
  const { instances } = useInstances()

  // Find the full instance data for this node
  const instance = instances.find((i) => i.service_id === node.id)
  const metrics = instance?.host_metrics || node.metrics

  const statusColor =
    node.status === 'offline'
      ? 'text-(--color-status-exited)'
      : node.isAffected
        ? 'text-(--color-status-warning)'
        : 'text-(--color-status-running)'

  const statusBg =
    node.status === 'offline'
      ? 'bg-(--color-status-exited-subtle) border-(--color-status-exited)/30'
      : node.isAffected
        ? 'bg-(--color-status-warning-subtle) border-(--color-status-warning)/30'
        : 'bg-(--color-status-running-subtle) border-(--color-status-running)/30'

  return (
    <div className="w-full md:w-80 bg-(--color-bg-surface) border border-(--color-border) rounded-xl flex flex-col overflow-hidden max-h-[80vh]">
      {/* Header */}
      <div className={`px-4 py-3 border-b border-(--color-border) flex items-center justify-between ${statusBg}`}>
        <div className="flex items-center gap-2">
          <Server className={`w-5 h-5 ${statusColor}`} />
          <div>
            <h4 className="text-sm font-bold text-(--color-text-main)">{node.hostname}</h4>
            <p className="text-xs text-(--color-text-muted) font-mono">{node.id}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-(--color-text-muted) hover:text-(--color-text-main) hover:bg-(--color-bg-base) transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status badge */}
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${statusBg} ${statusColor}`}>
          {node.isOrigin ? t('originNode') : node.status === 'offline' ? t('down') : node.isAffected ? t('degraded') : t('healthy')}
        </div>

        {/* Services network */}
        {onShowNetwork && (
          <button
            onClick={onShowNetwork}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-(--color-primary) text-white text-sm font-semibold hover:bg-(--color-primary-hover) transition-colors"
          >
            <Network className="w-4 h-4" />
            {t('servicesNetwork')}
          </button>
        )}

        {/* Metrics */}
        {metrics && (
          <div>
            <h5 className="text-xs font-bold text-(--color-text-muted) uppercase tracking-wide mb-2">
              {t('nodeMetrics')}
            </h5>
            <div className="grid grid-cols-2 gap-2">
              <MetricCard
                icon={Cpu}
                label={t('cpu')}
                value={`${metrics.cpu_percent.toFixed(1)}%`}
                color={metrics.cpu_percent > 80 ? 'text-(--color-status-exited)' : 'text-(--color-text-main)'}
              />
              <MetricCard
                icon={MemoryStick}
                label={t('memory')}
                value={`${metrics.memory_percent.toFixed(1)}%`}
                color={metrics.memory_percent > 80 ? 'text-(--color-status-exited)' : 'text-(--color-text-main)'}
              />
              <MetricCard
                icon={HardDrive}
                label={t('disk')}
                value={`${metrics.disk_percent.toFixed(1)}%`}
                color={metrics.disk_percent > 80 ? 'text-(--color-status-exited)' : 'text-(--color-text-main)'}
              />
              <MetricCard
                icon={Activity}
                label={t('loadAverage')}
                value={metrics.load_average.toFixed(2)}
                color="text-(--color-text-main)"
              />
            </div>

            {metrics.memory_total > 0 && (
              <div className="mt-2 text-xs text-(--color-text-muted)">
                {t('memoryUsage')}: {bytes(metrics.memory_used)} / {bytes(metrics.memory_total)}
              </div>
            )}
          </div>
        )}

        {/* Containers */}
        <div>
          <h5 className="text-xs font-bold text-(--color-text-muted) uppercase tracking-wide mb-2">
            {t('nodeContainers')}
          </h5>
          <div className="bg-(--color-bg-base) border border-(--color-border) rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-(--color-text-muted)">{t('total')}</span>
              <span className="font-semibold text-(--color-text-main)">{instance?.total_containers ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-(--color-text-muted)">{t('running')}</span>
              <span className="font-semibold text-(--color-status-running)">{instance?.running_containers ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-(--color-text-muted)">{t('stopped')}</span>
              <span className="font-semibold text-(--color-status-exited)">
                {(instance?.total_containers ?? 0) - (instance?.running_containers ?? 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Last seen */}
        {instance && (
          <div className="text-xs text-(--color-text-muted)">
            {t('lastHeartbeat')}: {timeAgo(instance.last_seen)}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: string
}) {
  return (
    <div className="bg-(--color-bg-base) border border-(--color-border) rounded-lg p-2.5 flex flex-col items-center text-center">
      <Icon className="w-4 h-4 text-(--color-text-muted) mb-1" />
      <span className={`text-sm font-bold ${color}`}>{value}</span>
      <span className="text-[10px] text-(--color-text-muted)">{label}</span>
    </div>
  )
}
