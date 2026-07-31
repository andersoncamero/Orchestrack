import { useMemo } from 'react'
import { Network, Server, AlertTriangle, Activity, X } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { Badge } from '../atoms/Badge'

interface AffectedNode {
  device_id: string
  hostname: string
  status: string
  is_origin: boolean
}

interface MultiHostPropagationPanelProps {
  incidentId: string
  affectedServers: AffectedNode[]
  affectedCount: number
  totalDevices: number
  infrastructureAffected: number
  onDismiss?: () => void
}

export function MultiHostPropagationPanel({
  incidentId,
  affectedServers,
  affectedCount,
  totalDevices,
  infrastructureAffected,
  onDismiss,
}: MultiHostPropagationPanelProps) {
  const { t } = useLanguage()

  const sortedServers = useMemo(() => {
    return [...affectedServers].sort((a, b) => {
      if (a.is_origin && !b.is_origin) return -1
      if (!a.is_origin && b.is_origin) return 1
      return a.hostname.localeCompare(b.hostname)
    })
  }, [affectedServers])

  return (
    <div className="bg-(--color-status-exited-subtle) border border-(--color-status-exited)/30 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-(--color-status-exited) flex items-center justify-center">
            <Network className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-(--color-text-main) font-bold text-lg">
              {t('multiHostImpact')}
            </h3>
            <div className="flex items-center gap-2 text-sm text-(--color-text-muted)">
              <Activity className="w-3.5 h-3.5" />
              <span>{t('livePropagation')}</span>
              <Badge state="exited" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-(--color-status-exited)">
              {infrastructureAffected.toFixed(1)}%
            </p>
            <p className="text-xs text-(--color-text-muted)">{t('infrastructureAffected')}</p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-(--color-text-muted) hover:text-(--color-text-main) hover:bg-(--color-bg-base) transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-5 px-4 py-3 bg-(--color-bg-surface) border border-(--color-border) rounded-xl">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-(--color-status-exited)" />
          <span className="text-sm text-(--color-text-muted)">
            {affectedCount} {t('affectedHosts')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-(--color-status-warning)" />
          <span className="text-sm text-(--color-text-muted)">
            {totalDevices} {t('totalCluster')}
          </span>
        </div>
        <div className="flex-1 h-2 bg-(--color-bg-base) rounded-full overflow-hidden">
          <div
            className="h-full bg-(--color-status-exited) rounded-full transition-all duration-500"
            style={{ width: `${Math.min(infrastructureAffected, 100)}%` }}
          />
        </div>
      </div>

      {/* Affected servers grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {sortedServers.map((server) => (
          <div
            key={server.device_id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
              server.is_origin
                ? 'bg-(--color-status-exited-subtle) border-(--color-status-exited)/40'
                : 'bg-(--color-bg-surface) border-(--color-border)'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              server.is_origin ? 'bg-(--color-status-exited)' : 'bg-(--color-status-warning-subtle)'
            }`}>
              <Server className={`w-4 h-4 ${server.is_origin ? 'text-white' : 'text-(--color-status-warning)'}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-(--color-text-main) truncate">
                {server.hostname || server.device_id}
              </p>
              {server.is_origin && (
                <p className="text-xs text-(--color-status-exited)">{t('originServer')}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-(--color-status-exited)/20 flex items-center justify-between">
        <span className="text-xs text-(--color-text-muted)">
          {t('propagationInProgress')} · ID: <span className="font-mono">{incidentId.slice(0, 8)}</span>
        </span>
        <span className="text-xs text-(--color-text-muted)">
          {new Date().toLocaleTimeString()}
        </span>
      </div>
    </div>
  )
}
