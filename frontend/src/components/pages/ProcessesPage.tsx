import { useEffect, useMemo, useState } from 'react'
import { Cpu, Search, Server, Eye, ArrowLeft, Loader2 } from 'lucide-react'
import { MainLayout } from '../templates/MainLayout'
import { Spinner } from '../atoms/Spinner'
import { Badge } from '../atoms/Badge'
import { UserNavActions } from '../molecules/UserNavActions'
import { Button } from '../atoms/Button'
import { ProcessesTable } from '../organisms/ProcessesTable'
import { useInstances } from '../../hooks/useInstances'
import { useLanguage } from '../../contexts/LanguageContext'
import { useWebSocket } from '../../hooks/useWebSocket'
import { api } from '../../services/api'
import type { ProcessInfo } from '../../types'

export default function ProcessesPage() {
  const { t } = useLanguage()
  const { instances, loading, error } = useInstances()
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProcessInfo[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchTotal, setSearchTotal] = useState(0)

  const selectedInstanceData = useMemo(() => {
    return instances.find((i) => i.service_id === selectedInstance) || null
  }, [instances, selectedInstance])

  // Actualizar resultados de búsqueda si llega un heartbeat con procesos actualizados
  // mientras estamos en la vista de detalle y no hay búsqueda activa.
  useWebSocket({
    room: 'dashboard',
    onMessage: (message: any) => {
      if (
        message.type === 'heartbeat' &&
        message.payload?.service_id === selectedInstance &&
        message.payload?.host_metrics?.processes &&
        searchQuery === ''
      ) {
        setSearchResults(message.payload.host_metrics.processes)
        if (typeof message.payload.host_metrics.process_count === 'number') {
          // no-op: el conteo total se lee del estado de instancias
        }
      }
    },
  })

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!selectedInstance) return

    setSearchLoading(true)
    try {
      const isNumeric = /^\d+$/.test(searchQuery.trim())
      const data = await api.searchProcesses(
        selectedInstance,
        searchQuery.trim(),
        isNumeric,
        50
      )
      setSearchResults(data.processes)
      setSearchTotal(data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setSearchLoading(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults(null)
    setSearchTotal(0)
  }

  // Restaurar procesos del heartbeat cuando cambiamos de instancia o limpiamos búsqueda.
  useEffect(() => {
    if (!selectedInstanceData) {
      setSearchResults(null)
      return
    }
    if (searchQuery === '') {
      setSearchResults(selectedInstanceData.host_metrics?.processes || [])
    }
  }, [selectedInstanceData, searchQuery])

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
          <Cpu className="w-6 h-6 text-(--color-primary)" />
          <div>
            <h2 className="text-2xl font-bold text-(--color-text-main)">{t('systemProcesses')}</h2>
            <p className="text-(--color-text-muted) text-sm">{t('systemProcessesDescription')}</p>
          </div>
        </div>
        <UserNavActions />
      </header>

      <main className="flex-1 p-8 bg-(--color-bg-base) space-y-8">
        {selectedInstanceData ? (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectedInstance(null)
                    clearSearch()
                  }}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('backToInstances')}
                </Button>
                <div>
                  <h3 className="text-(--color-text-main) font-semibold text-lg">
                    {t('processesOf')} {selectedInstanceData.hostname}
                  </h3>
                  <p className="text-(--color-text-muted) text-sm font-mono">{selectedInstanceData.service_id}</p>
                </div>
              </div>
              <Badge state={selectedInstanceData.status} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-4">
                <p className="text-(--color-text-muted) text-xs font-medium uppercase tracking-wider">{t('totalProcesses')}</p>
                <p className="text-3xl font-bold text-(--color-text-main) mt-1">
                  {selectedInstanceData.process_count ?? selectedInstanceData.host_metrics?.process_count ?? '-'}
                </p>
              </div>
              <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-4">
                <p className="text-(--color-text-muted) text-xs font-medium uppercase tracking-wider">{t('topProcessesShown')}</p>
                <p className="text-3xl font-bold text-(--color-text-main) mt-1">
                  {searchResults?.length ?? '-'}
                </p>
              </div>
              <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-4 flex items-center">
                <form onSubmit={handleSearch} className="flex items-center gap-2 w-full">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--color-text-muted)" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('searchProcessPlaceholder')}
                      className="w-full pl-10 pr-4 py-2 bg-(--color-bg-base) border border-(--color-border) rounded-lg text-(--color-text-main) placeholder:text-(--color-text-muted) focus:outline-none focus:border-(--color-primary)"
                    />
                  </div>
                  <Button
                    onClick={handleSearch}
                    disabled={searchLoading}
                    className="flex items-center gap-2"
                  >
                    {searchLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t('search')}
                  </Button>
                  {searchQuery && (
                    <Button variant="secondary" onClick={clearSearch}>
                      {t('clear')}
                    </Button>
                  )}
                </form>
              </div>
            </div>

            {searchQuery && searchTotal > 0 && (
              <p className="text-(--color-text-muted) text-sm">
                {t('searchResultsCount').replace('{count}', searchTotal.toString())}
              </p>
            )}

            <ProcessesTable processes={searchResults ?? undefined} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {instances.map((instance) => {
              const processCount = instance.process_count ?? instance.host_metrics?.process_count ?? 0

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

                  <div className="flex items-center gap-3 mb-5">
                    <Cpu className="w-5 h-5 text-(--color-primary)" />
                    <span className="text-2xl font-bold text-(--color-text-main)">{processCount}</span>
                    <span className="text-(--color-text-muted) text-sm">{processCount === 1 ? t('process') : t('processes')}</span>
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
        )}
      </main>
    </MainLayout>
  )
}
