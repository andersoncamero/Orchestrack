import { useCallback, useEffect, useMemo, useState } from 'react'
import { RotateCcw, Search, Trash2, Server, Boxes, Eye, ArrowLeft } from 'lucide-react'

import { MainLayout } from '../templates/MainLayout'
import { Spinner } from '../atoms/Spinner'
import { Badge } from '../atoms/Badge'
import { Button } from '../atoms/Button'
import { ConfirmModal } from '../molecules/ConfirmModal'
import { ContainerDetailPanel } from '../organisms/ContainerDetailPanel'
import { useInstances } from '../../hooks/useInstances'
import { useLanguage } from '../../contexts/LanguageContext'
import { useWebSocket } from '../../hooks/useWebSocket'
import { api } from '../../services/api'
import { timeAgo } from '../../utils/time'
import type { ContainerSummary } from '../../types'

interface ContainerWithHost extends ContainerSummary {
  hostname: string;
}

export default function ContainersPage() {
  const { t } = useLanguage()
  const { instances, loading: loadingInstances } = useInstances()
  const [selectedInstance, setSelectedInstance] = useState<string>('')
  const [containers, setContainers] = useState<ContainerWithHost[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('all')
  const [containerToRemove, setContainerToRemove] = useState<ContainerWithHost | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)
  const [selectedContainer, setSelectedContainer] = useState<ContainerWithHost | null>(null)

  const selectedInstanceData = instances.find((i) => i.service_id === selectedInstance) || null

  const handleWebSocketMessage = useCallback((message: unknown) => {
    const event = message as { type: string; payload: Record<string, unknown> }
    if (!event?.payload?.service_id) return

    const serviceId = event.payload.service_id as string
    if (selectedInstance && serviceId !== selectedInstance) return

    const instance = instances.find((i) => i.service_id === serviceId)

    setContainers((prev) => {
      switch (event.type) {
        case 'container.started':
        case 'container.stopped':
        case 'container.restarted':
        case 'container.renamed': {
          const id = event.payload.id as string
          return prev.map((c) => {
            if (c.service_id !== serviceId || c.id !== id) return c
            return {
              ...c,
              state: event.type === 'container.started' || event.type === 'container.restarted' ? 'running' : 'exited',
              name: event.type === 'container.renamed' ? (event.payload.new_name as string) : c.name,
            }
          })
        }
        case 'container.created': {
          const newContainer: ContainerWithHost = {
            id: event.payload.id as string,
            name: (event.payload.name as string) || (event.payload.id as string).slice(0, 12),
            image: (event.payload.image as string) || '',
            status: 'created',
            state: 'created',
            ports: [],
            created: (event.payload.created_at as number) || Date.now() / 1000,
            service_id: serviceId,
            hostname: instance?.hostname || '',
          }
          return [...prev, newContainer]
        }
        case 'container.removed': {
          return prev.filter((c) => c.id !== event.payload.id)
        }
        case 'container.event': {
          const id = event.payload.id as string
          const newState = event.payload.state as string | undefined
          return prev.map((c) => {
            if (c.service_id !== serviceId || c.id !== id) return c
            return {
              ...c,
              state: newState || c.state,
              status: newState || c.status,
            }
          })
        }
        default:
          return prev
      }
    })
  }, [instances, selectedInstance])

  useWebSocket({
    room: selectedInstance ? `containers:${selectedInstance}` : 'containers-idle',
    onMessage: handleWebSocketMessage,
  })

  useEffect(() => {
    if (!selectedInstance) {
      setContainers([])
      setLoading(false)
      return
    }
    let cancelled = false
    const fetchContainersForInstance = async () => {
      setLoading(true)
      try {
        const data = await api.getContainers(selectedInstance)
        if (cancelled) return
        setContainers(data.containers.map((c) => ({ ...c, hostname: '' })))
      } catch (err) {
        console.error(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchContainersForInstance()
    return () => {
      cancelled = true
    }
  }, [selectedInstance])

  const filtered = useMemo(() => {
    return containers.filter((c) => {
      const matchesSearch = (c.name || c.id).toLowerCase().includes(search.toLowerCase())
      const matchesState = stateFilter === 'all' || c.state === stateFilter
      return matchesSearch && matchesState
    })
  }, [containers, search, stateFilter])

  const states = useMemo(() => {
    const set = new Set(containers.map((c) => c.state))
    return Array.from(set).sort()
  }, [containers])

  const handleAction = async (action: 'start' | 'stop' | 'restart', container: ContainerWithHost) => {
    try {
      const serviceId = container.service_id || ''
      if (action === 'start') await api.startContainer(serviceId, container.id)
      if (action === 'stop') await api.stopContainer(serviceId, container.id)
      if (action === 'restart') await api.restartContainer(serviceId, container.id)

      const data = await api.getContainers(serviceId)
      setContainers(data.containers.map((nc) => ({
        ...nc,
        hostname: '',
      })))
    } catch (err) {
      console.error(err)
    }
  }

  const handleRemove = (container: ContainerWithHost) => {
    setContainerToRemove(container)
  }

  const confirmRemove = async () => {
    if (!containerToRemove) return
    setRemoveLoading(true)
    try {
      await api.removeContainer(containerToRemove.service_id || '', containerToRemove.id, true, false)
      setContainerToRemove(null)
      if (containerToRemove.service_id) {
        const data = await api.getContainers(containerToRemove.service_id)
        setContainers(data.containers.map((nc) => ({
          ...nc,
          hostname: '',
        })))
      }
    } catch (err) {
      console.error(err)
      alert(t('errorRemovingContainer'))
    } finally {
      setRemoveLoading(false)
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
    <MainLayout>
      <header className="h-20 bg-(--color-bg-surface)/80 backdrop-blur-sm border-b border-(--color-border) flex items-center px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Boxes className="w-6 h-6 text-(--color-primary)" />
          <div>
            <h2 className="text-2xl font-bold text-(--color-text-main)">{t('dockerContainers')}</h2>
            <p className="text-(--color-text-muted) text-sm">{t('allDockerContainers')}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 bg-(--color-bg-base) space-y-6">
        {selectedInstanceData ? (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedInstance('')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('backToInstances')}
                </Button>
                <div>
                  <h3 className="text-(--color-text-main) font-semibold text-lg">
                    {t('containersOf')} {selectedInstanceData.hostname}
                  </h3>
                  <p className="text-(--color-text-muted) text-sm font-mono">{selectedInstanceData.service_id}</p>
                </div>
              </div>
              <Badge state={selectedInstanceData.status} />
            </div>

            <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--color-text-muted)" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t('searchContainer')}
                      className="w-full pl-10 pr-4 py-2 bg-(--color-bg-base) border border-(--color-border) rounded-lg text-(--color-text-main) placeholder:text-(--color-text-muted) focus:outline-none focus:border-(--color-primary)"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className="bg-(--color-bg-base) border border-(--color-border) text-(--color-text-main) text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-(--color-primary)"
                  >
                    <option value="all">{t('allStates')}</option>
                    {states.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl overflow-hidden animate-fade-in">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-(--color-bg-surface)">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('name')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('image')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('host')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('state')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('ports')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('created')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-(--color-border)">
                      {filtered.map((container) => {
                        const isRunning = container.state === 'running'
                        const ports = (container.ports || [])
                          .filter((p) => p.public_port)
                          .map((p) => `${p.public_port}:${p.private_port}`)
                          .join(', ') || '-'
                        const instance = instances.find((i) => i.service_id === container.service_id)
                        const hostname = instance ? instance.hostname : container.hostname || 'Desconocido'
                        return (
                          <tr
                            key={container.id}
                            className="hover:bg-(--color-bg-surface-hover)/50 transition-colors cursor-pointer"
                            onClick={() => setSelectedContainer(container)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-(--color-text-main) font-medium max-w-xs truncate" title={container.name || container.id}>
                              <span className="hover:text-(--color-primary) transition-colors">
                                {container.name || container.id.slice(0, 12)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-(--color-text-muted) max-w-xs truncate" title={container.image}>
                              {container.image}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-(--color-text-secondary)">{hostname}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge state={container.state} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-(--color-text-secondary) text-sm">{ports}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-(--color-text-secondary) text-sm">{timeAgo(container.created)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {!isRunning && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleAction('start', container)
                                    }}
                                    className="px-3 py-1.5 bg-(--color-primary) hover:bg-(--color-primary-hover) text-white text-sm rounded-lg transition-colors"
                                  >
                                    {t('start')}
                                  </button>
                                )}
                                {isRunning && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleAction('stop', container)
                                    }}
                                    className="px-3 py-1.5 bg-(--color-status-exited) hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                                  >
                                    {t('stop')}
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleAction('restart', container)
                                  }}
                                  className="p-1.5 bg-(--color-bg-surface-hover) hover:bg-(--color-border) text-(--color-text-main) rounded-lg transition-colors"
                                  title={t('restart')}
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRemove(container)
                                  }}
                                  className="p-1.5 bg-(--color-status-exited-subtle) hover:bg-(--color-status-exited)/20 text-(--color-status-exited) rounded-lg transition-colors"
                                  title={t('remove')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-(--color-text-muted)">
                            {t('noContainersFound')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
            {instances.map((instance) => (
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

                <div className="flex items-center gap-3 mb-5">
                  <Boxes className="w-5 h-5 text-(--color-primary)" />
                  <span className="text-(--color-text-muted) text-sm">{t('manageContainers')}</span>
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
            ))}
          </div>
        )}
      </main>

      {selectedContainer && (
        <ContainerDetailPanel
          container={selectedContainer}
          identifier={selectedInstance}
          isOpen={selectedContainer !== null}
          onClose={() => setSelectedContainer(null)}
        />
      )}

      <ConfirmModal
        isOpen={containerToRemove !== null}
        title={t('removeContainer')}
        message={containerToRemove ? t('removeContainerConfirm').replace('{name}', containerToRemove.name || containerToRemove.id.slice(0, 12)) : ''}
        confirmText={t('remove')}
        cancelText={t('cancel')}
        onConfirm={confirmRemove}
        onCancel={() => setContainerToRemove(null)}
        isLoading={removeLoading}
      />
    </MainLayout>
  )
}
