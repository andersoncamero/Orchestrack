import { useEffect } from 'react'
import { Network, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { MainLayout } from '../templates/MainLayout'
import { UserNavActions } from '../molecules/UserNavActions'
import { TopologyMap } from '../organisms/TopologyMap'
import { TopologyNodeDetail } from '../organisms/TopologyNodeDetail'
import { ContainerTopologyPanel } from '../organisms/ContainerTopologyPanel'
import { Spinner } from '../atoms/Spinner'
import { useInstances } from '../../hooks/useInstances'
import { useTopology } from '../../hooks/useTopology'
import { useContainerTopology } from '../../hooks/useContainerTopology'
import { useLanguage } from '../../contexts/LanguageContext'

export default function TopologyPage() {
  const { t } = useLanguage()
  const { instances, loading, error } = useInstances()
  const {
    nodes,
    edges,
    loading: topoLoading,
    selectedNode,
    selectedNodeId,
    setSelectedNodeId,
  } = useTopology(instances)

  const [searchParams, setSearchParams] = useSearchParams()
  const selectedServer = searchParams.get('server')
  const {
    links,
    loading: topologyLoading,
    error: topologyError,
    refetch: refetchTopology,
  } = useContainerTopology({ identifier: selectedServer || undefined })

  const clearServer = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('server')
    setSearchParams(next, { replace: true })
  }

  const setServer = (id: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('server', id)
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    if (!selectedServer) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearServer()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedServer, clearServer])

  const isLoading = loading || topoLoading

  return (
    <MainLayout>
      <header className="h-20 bg-(--color-bg-surface)/80 backdrop-blur-sm border-b border-(--color-border) flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Network className="w-6 h-6 text-(--color-primary)" />
          <div>
            <h2 className="text-2xl font-bold text-(--color-text-main)">
              {t('topologyMap')}
            </h2>
            <p className="text-(--color-text-muted) text-sm">
              {t('multiServerTopology')}
            </p>
          </div>
        </div>
        <UserNavActions />
      </header>

      <main className="h-[calc(100vh-80px)] p-6 bg-(--color-bg-base) flex flex-col md:flex-row gap-6 overflow-hidden relative">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-(--color-status-exited-subtle) border border-(--color-status-exited)/30 text-(--color-status-exited) px-6 py-4 rounded-xl">
              Error: {error}
            </div>
          </div>
        ) : (
          <>
            {/* Map area */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              <div className="flex items-center justify-between">
                <p className="text-(--color-text-muted) text-sm">
                  {t('connectedServers')}: {nodes.length} · {t('clickNodeDetails')}
                </p>
              </div>
              <div className="flex-1 min-h-0">
                <TopologyMap
                  nodes={nodes}
                  edges={edges}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={setSelectedNodeId}
                />
              </div>
            </div>

            {/* Server detail panel */}
            {selectedNode && (
              <div className="shrink-0">
                <TopologyNodeDetail
                  node={selectedNode}
                  onClose={() => setSelectedNodeId(null)}
                  onShowNetwork={() => setServer(selectedNode.id)}
                />
              </div>
            )}
          </>
        )}

        {/* Modal: Red de Servicios / Container Topology */}
        {selectedServer && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 sm:p-6"
            onClick={clearServer}
          >
            <div
              className="bg-(--color-bg-surface) border border-(--color-border) rounded-2xl w-full max-w-4xl h-[680px] shadow-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-(--color-border) flex items-center justify-between bg-(--color-bg-surface)">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-(--color-primary-subtle) text-(--color-primary)">
                    <Network className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-(--color-text-main)">
                      {t('containerTopology')}
                    </h3>
                    <p className="text-xs text-(--color-text-muted) font-mono">
                      {selectedServer}
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearServer}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-(--color-text-muted) hover:text-(--color-text-main) hover:bg-(--color-bg-base) transition-colors"
                  aria-label={t('close')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 p-4 min-h-0 bg-(--color-bg-base) overflow-hidden flex flex-col">
                <ContainerTopologyPanel
                  links={links}
                  loading={topologyLoading}
                  error={topologyError}
                  onRefresh={refetchTopology}
                  className="flex-1 min-h-0 border-0 rounded-none bg-transparent"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </MainLayout>
  )
}
