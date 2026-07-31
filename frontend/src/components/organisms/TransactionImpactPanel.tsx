import { useState } from 'react'
import { Activity, Server, Zap, AlertTriangle, ArrowDown, Layers } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { Spinner } from '../atoms/Spinner'
import type { IncidentTransactionsResponse, IncidentServerTransactionsResponse } from '../../types'

interface TransactionImpactPanelProps {
  transactionsData?: IncidentTransactionsResponse
  serverTransactionsData?: IncidentServerTransactionsResponse
  loading?: boolean
  error?: string | null
}

export function TransactionImpactPanel({
  transactionsData,
  serverTransactionsData,
  loading,
  error,
}: TransactionImpactPanelProps) {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<'categories' | 'servers'>('categories')

  if (loading) {
    return (
      <div className="bg-(--color-bg-base) border border-(--color-border) rounded-xl p-8 flex items-center justify-center">
        <Spinner size="md" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-(--color-status-exited-subtle) border border-(--color-status-exited)/30 text-(--color-status-exited) px-4 py-3 rounded-xl text-sm">
        {error}
      </div>
    )
  }

  const categories = transactionsData?.categories || []
  const totalFailed = transactionsData?.total_failed || 0
  const serverRecords = serverTransactionsData?.records || []

  if (categories.length === 0 && serverRecords.length === 0) {
    return (
      <div className="bg-(--color-bg-base) border border-(--color-border) rounded-xl p-6 text-center">
        <p className="text-(--color-text-muted) text-sm">{t('noTransactionImpact')}</p>
      </div>
    )
  }

  return (
    <div className="bg-(--color-bg-base) border border-(--color-border) rounded-xl overflow-hidden">
      {/* Header con resumen */}
      <div className="px-5 py-4 border-b border-(--color-border) flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-(--color-status-exited)" />
          <h3 className="text-sm font-bold text-(--color-text-main) uppercase tracking-wide">
            {t('affectedTransactionsAndServices')}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge severity="critical" label={`${totalFailed} ${t('failedRequests')}`} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-(--color-border)">
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'categories'
              ? 'text-(--color-primary) border-b-2 border-(--color-primary) bg-(--color-primary-subtle)'
              : 'text-(--color-text-muted) hover:text-(--color-text-main)'
          }`}
        >
          {t('byCategory')}
        </button>
        <button
          onClick={() => setActiveTab('servers')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'servers'
              ? 'text-(--color-primary) border-b-2 border-(--color-primary) bg-(--color-primary-subtle)'
              : 'text-(--color-text-muted) hover:text-(--color-text-main)'
          }`}
        >
          {t('byServer')}
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'categories' && (
          <div className="space-y-3">
            {categories.length === 0 ? (
              <p className="text-(--color-text-muted) text-sm text-center py-4">{t('noCategoryData')}</p>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.category}
                  className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-(--color-primary)" />
                      <span className="text-sm font-semibold text-(--color-text-main)">
                        {cat.label || cat.category}
                      </span>
                    </div>
                    <Badge
                      severity={cat.failed_count > 50 ? 'critical' : cat.failed_count > 10 ? 'warning' : 'info'}
                      label={`${cat.failed_count} ${t('errors')}`}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {cat.transaction_types.map((txType) => (
                      <span
                        key={txType}
                        className="px-2 py-0.5 rounded-md bg-(--color-bg-base) border border-(--color-border) text-xs text-(--color-text-muted)"
                      >
                        {txType}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'servers' && (
          <div className="space-y-3">
            {serverRecords.length === 0 ? (
              <p className="text-(--color-text-muted) text-sm text-center py-4">{t('noServerTransactionData')}</p>
            ) : (
              serverRecords.map((record) => (
                <div
                  key={record.id}
                  className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Server className="w-4 h-4 text-(--color-primary) shrink-0" />
                      <span className="text-sm font-semibold text-(--color-text-main) truncate">
                        {record.service_name}
                      </span>
                      {record.endpoint && (
                        <span className="text-xs text-(--color-text-muted) truncate">
                          {record.endpoint}
                        </span>
                      )}
                    </div>
                    <Badge
                      severity={record.failed_requests_count > 50 ? 'critical' : record.failed_requests_count > 10 ? 'warning' : 'info'}
                      label={`${record.failed_requests_count} ${t('failedRequests')}`}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-(--color-text-muted)">{t('device')}:</span>
                    <span className="text-xs font-mono text-(--color-text-main)">{record.device_id}</span>
                    {record.error_code && (
                      <span className="px-1.5 py-0.5 rounded bg-(--color-status-exited-subtle) text-(--color-status-exited) text-xs font-mono">
                        {record.error_code}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer resumen */}
      {(categories.length > 0 || serverRecords.length > 0) && (
        <div className="px-5 py-3 border-t border-(--color-border) bg-(--color-bg-surface)">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-(--color-status-exited)">{totalFailed}</p>
              <p className="text-xs text-(--color-text-muted)">{t('totalFailedRequests')}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-(--color-text-main)">{categories.length}</p>
              <p className="text-xs text-(--color-text-muted)">{t('affectedCategories')}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-(--color-text-main)">
                {new Set(serverRecords.map((r) => r.device_id)).size}
              </p>
              <p className="text-xs text-(--color-text-muted)">{t('affectedServers')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Badge({ severity, label }: { severity: 'critical' | 'warning' | 'info'; label: string }) {
  const colors = {
    critical: 'bg-(--color-status-exited-subtle) text-(--color-status-exited) border-(--color-status-exited)/30',
    warning: 'bg-(--color-status-warning-subtle) text-(--color-status-warning) border-(--color-status-warning)/30',
    info: 'bg-(--color-primary-subtle) text-(--color-primary) border-(--color-primary)/30',
  }

  const icons = {
    critical: <AlertTriangle className="w-3 h-3" />,
    warning: <Zap className="w-3 h-3" />,
    info: <ArrowDown className="w-3 h-3" />,
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium ${colors[severity]}`}
    >
      {icons[severity]}
      {label}
    </span>
  )
}
