import { useCallback, useEffect, useMemo, useState } from 'react'
import { X, Info, History, Terminal } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useWebSocket } from '../../hooks/useWebSocket'
import { api } from '../../services/api'
import { timeAgo } from '../../utils/time'
import { LogViewer } from '../molecules/LogViewer'
import type { Container, ContainerEvent, ContainerSummary } from '../../types'

interface ContainerDetailPanelProps {
  container: ContainerSummary | Container
  identifier: string
  isOpen: boolean
  onClose: () => void
}

type Tab = 'info' | 'events' | 'logs'

export function ContainerDetailPanel({ container, identifier, isOpen, onClose }: ContainerDetailPanelProps) {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<Tab>('info')
  const [fullContainer, setFullContainer] = useState<Container | null>(null)
  const [loadingContainer, setLoadingContainer] = useState(false)
  const [events, setEvents] = useState<ContainerEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [showTimestamps, setShowTimestamps] = useState(false)
  const [tailLines, setTailLines] = useState(100)

  const isFullContainer = (c: ContainerSummary | Container): c is Container =>
    'command' in c && 'env' in c

  const displayContainer = isFullContainer(container) ? container : fullContainer

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('info')
      setEvents([])
      setLogs([])
      setFullContainer(null)
      return
    }

    if (!isFullContainer(container)) {
      setLoadingContainer(true)
      api.getContainer(identifier, container.id)
        .then((data) => setFullContainer(data.container))
        .catch(console.error)
        .finally(() => setLoadingContainer(false))
    }
  }, [isOpen, container, identifier])

  const fetchEvents = useCallback(() => {
    setLoadingEvents(true)
    api.getContainerEvents(identifier, container.id, { limit: 50 })
      .then((data) => setEvents(data.events || []))
      .catch(console.error)
      .finally(() => setLoadingEvents(false))
  }, [identifier, container.id])

  const fetchLogs = useCallback(() => {
    setLoadingLogs(true)
    api.getContainerLogs(identifier, container.id, {
      tail: tailLines,
      timestamps: showTimestamps,
      stdout: true,
      stderr: true,
    })
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoadingLogs(false))
  }, [identifier, container.id, tailLines, showTimestamps])

  useEffect(() => {
    if (isOpen && activeTab === 'events') {
      fetchEvents()
    }
  }, [isOpen, activeTab, fetchEvents])

  useEffect(() => {
    if (isOpen && activeTab === 'logs') {
      fetchLogs()
    }
  }, [isOpen, activeTab, fetchLogs])

  const handleWebSocketMessage = useCallback((message: unknown) => {
    const event = message as { type: string; payload: Record<string, unknown> }
    if (event.type === 'container.event' && event.payload?.container_id === container.id) {
      const newEvent: ContainerEvent = {
        id: (event.payload.id as string) || `${Date.now()}`,
        type: (event.payload.event_type as string) || 'event',
        message: (event.payload.message as string) || '',
        timestamp: (event.payload.timestamp as number) || Date.now() / 1000,
        container_id: container.id,
        container_name: container.name || container.id.slice(0, 12),
      }
      setEvents((prev) => [newEvent, ...prev])
    }
  }, [container.id, container.name])

  useWebSocket({
    room: `containers:${identifier}`,
    onMessage: handleWebSocketMessage,
  })

  const handleCopyLogs = useCallback(() => {
    const safeLogs = Array.isArray(logs) ? logs : []
    const text = safeLogs.join('\n')
    navigator.clipboard.writeText(text).catch(console.error)
  }, [logs])

  const handleDownloadLogs = useCallback(() => {
    const safeLogs = Array.isArray(logs) ? logs : []
    const text = safeLogs.join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${container.name || container.id.slice(0, 12)}-logs.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [logs, container.name, container.id])

  const tabs = useMemo(() => [
    { key: 'info' as Tab, label: t('generalInfo'), icon: Info },
    { key: 'events' as Tab, label: t('events'), icon: History },
    { key: 'logs' as Tab, label: t('logs'), icon: Terminal },
  ], [t])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-(--color-text-main)/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-(--color-bg-surface) border border-(--color-border) rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--color-border)">
          <div className="min-w-0 pr-4">
            <h2 className="text-lg font-semibold text-(--color-text-main) truncate">{container.name || container.id.slice(0, 12)}</h2>
            <p className="text-xs text-(--color-text-muted) font-mono break-all">{container.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-(--color-text-muted) hover:text-(--color-text-main) hover:bg-(--color-bg-surface-hover) rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-6 py-2 border-b border-(--color-border) bg-(--color-bg-base)">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-(--color-primary-subtle) text-(--color-primary)'
                    : 'text-(--color-text-secondary) hover:text-(--color-text-main) hover:bg-(--color-bg-surface-hover)'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'info' && (
            <div className="space-y-4">
              {loadingContainer && !displayContainer ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-(--color-primary) border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoField label={t('id')} value={container.id} monospace />
                    <InfoField label={t('name')} value={container.name || '-'} />
                    <InfoField label={t('image')} value={container.image || '-'} />
                    <InfoField label={t('state')} value={container.state || '-'} />
                    <InfoField label={t('status')} value={container.status || '-'} />
                    <InfoField label={t('created')} value={timeAgo(container.created)} />
                    {displayContainer && (
                      <>
                        <InfoField label={t('command')} value={displayContainer.command || '-'} />
                        <InfoField label={t('platform')} value={displayContainer.platform || '-'} />
                        <InfoField label={t('autoRemove')} value={displayContainer.auto_remove ? t('enabled') : t('disabled')} />
                      </>
                    )}
                  </div>

                  {displayContainer && displayContainer.env && displayContainer.env.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-(--color-text-main) mb-2">{t('environmentVariables')}</h4>
                      <div className="bg-(--color-bg-base) border border-(--color-border) rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-(--color-border)">
                            {displayContainer.env.map((env, i) => (
                              <tr key={i}>
                                <td className="px-4 py-2 text-(--color-text-secondary) font-mono text-xs whitespace-nowrap">{env.key}</td>
                                <td className="px-4 py-2 text-(--color-text-muted) font-mono text-xs break-all">{env.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {displayContainer && displayContainer.volumes && displayContainer.volumes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-(--color-text-main) mb-2">{t('volumes')}</h4>
                      <div className="bg-(--color-bg-base) border border-(--color-border) rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-(--color-text-muted) uppercase">{t('source')}</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-(--color-text-muted) uppercase">Target</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-(--color-text-muted) uppercase">{t('type')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-(--color-border)">
                            {displayContainer.volumes.map((vol, i) => (
                              <tr key={i}>
                                <td className="px-4 py-2 text-(--color-text-secondary) font-mono text-xs break-all">{vol.source}</td>
                                <td className="px-4 py-2 text-(--color-text-muted) font-mono text-xs break-all">{vol.target}</td>
                                <td className="px-4 py-2 text-(--color-text-muted) text-xs">{vol.type}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {displayContainer && displayContainer.labels && displayContainer.labels.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-(--color-text-main) mb-2">{t('labels')}</h4>
                      <div className="bg-(--color-bg-base) border border-(--color-border) rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-(--color-border)">
                            {displayContainer.labels.map((label, i) => (
                              <tr key={i}>
                                <td className="px-4 py-2 text-(--color-text-secondary) font-mono text-xs whitespace-nowrap">{label.key}</td>
                                <td className="px-4 py-2 text-(--color-text-muted) font-mono text-xs break-all">{label.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div className="space-y-3">
              {loadingEvents && events.length === 0 ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-(--color-primary) border-t-transparent rounded-full animate-spin" />
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-10 text-(--color-text-muted) text-sm">{t('noEvents')}</div>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="bg-(--color-bg-base) border border-(--color-border) rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-(--color-primary)">{event.type}</span>
                      <span className="text-xs text-(--color-text-muted)">{timeAgo(event.timestamp)}</span>
                    </div>
                    <p className="text-sm text-(--color-text-secondary)">{event.message}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <LogViewer
              logs={logs}
              loading={loadingLogs}
              autoScroll={autoScroll}
              onToggleAutoScroll={() => setAutoScroll((v) => !v)}
              onCopy={handleCopyLogs}
              onDownload={handleDownloadLogs}
              showTimestamps={showTimestamps}
              onToggleTimestamps={() => setShowTimestamps((v) => !v)}
              tailLines={tailLines}
              onChangeTailLines={setTailLines}
              onRefresh={fetchLogs}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function InfoField({ label, value, monospace }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div className="bg-(--color-bg-base) border border-(--color-border) rounded-lg px-4 py-3 min-w-0">
      <p className="text-xs text-(--color-text-muted) mb-1">{label}</p>
      <p className={`text-sm text-(--color-text-main) break-all ${monospace ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}
