import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Loader2, RefreshCw, Search, Star, Trash2, X, ArrowLeft, Eye, Server, Layers } from 'lucide-react'
import { MainLayout } from '../templates/MainLayout'
import { Spinner } from '../atoms/Spinner'
import { Badge } from '../atoms/Badge'
import { Button } from '../atoms/Button'
import { ConfirmModal } from '../molecules/ConfirmModal'
import { useInstances } from '../../hooks/useInstances'
import { useLanguage } from '../../contexts/LanguageContext'
import { useWebSocket } from '../../hooks/useWebSocket'
import { api } from '../../services/api'
import { timeAgo } from '../../utils/time'
import type { ImageSearchResult, ImageSummary } from '../../types'

interface ImageWithHost extends ImageSummary {
  hostname: string
  service_id: string
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

function getImageName(image: ImageWithHost): string {
  if (image.repo_tags && image.repo_tags.length > 0) {
    return image.repo_tags[0]
  }
  return image.id.slice(0, 12)
}

export default function ImagesPage() {
  const { t } = useLanguage()
  const { instances, loading: loadingInstances } = useInstances()
  const [images, setImages] = useState<ImageWithHost[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedHost, setSelectedHost] = useState('')
  const [showPullModal, setShowPullModal] = useState(false)
  const [pullImageName, setPullImageName] = useState('')
  const [pulling, setPulling] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [imageToRemove, setImageToRemove] = useState<ImageWithHost | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ImageSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const selectedInstanceData = instances.find((i) => i.service_id === selectedHost) || null

  const fetchImages = useCallback(async () => {
    if (!selectedHost) {
      setImages([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await api.getImages(selectedHost)
      setImages(
        data.images.map((img) => ({
          ...img,
          hostname: '',
          service_id: selectedHost,
        }))
      )
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedHost])

  const handleWebSocketMessage = useCallback((message: unknown) => {
    const event = message as { type: string; payload: Record<string, unknown> }
    if (event.type === 'image.pulled' || event.type === 'image.removed') {
      const serviceId = event.payload.service_id as string
      if (selectedHost && serviceId === selectedHost) {
        fetchImages()
      }
    }
  }, [selectedHost, fetchImages])

  useWebSocket({
    room: 'dashboard',
    onMessage: handleWebSocketMessage,
  })

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  const filtered = useMemo(() => {
    return images.filter((img) => getImageName(img).toLowerCase().includes(search.toLowerCase()))
  }, [images, search])

  const handlePull = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pullImageName.trim() || !selectedHost) return
    setPulling(true)
    try {
      await api.pullImage(selectedHost, pullImageName.trim())
      closePullModal()
      await fetchImages()
    } catch (err) {
      console.error(err)
      alert(t('errorDownloadingImage'))
    } finally {
      setPulling(false)
    }
  }

  const closePullModal = () => {
    setShowPullModal(false)
    setPullImageName('')
    setSearchQuery('')
    setSearchResults([])
    setSearchError(null)
    setHasSearched(false)
  }

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchError(null)
    setHasSearched(true)
    try {
      const data = await api.searchImages(searchQuery.trim(), 10)
      setSearchResults(data.images)
    } catch (err) {
      console.error(err)
      setSearchError(t('searchImageError'))
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const selectSearchResult = (result: ImageSearchResult) => {
    setPullImageName(`${result.name}:${result.default_tag}`)
  }

  const handleUpdate = async (image: ImageWithHost) => {
    const name = getImageName(image)
    setActionLoading(image.id)
    try {
      await api.pullImage(image.service_id, name)
      await fetchImages()
    } catch (err) {
      console.error(err)
      alert(t('errorUpdatingImage'))
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemove = (image: ImageWithHost) => {
    setRemoveError(null)
    setImageToRemove(image)
  }

  const closeRemoveModal = () => {
    setImageToRemove(null)
    setRemoveError(null)
  }

  const confirmRemove = async () => {
    if (!imageToRemove) return
    setActionLoading(imageToRemove.id)
    setRemoveError(null)
    try {
      await api.removeImage(imageToRemove.service_id, imageToRemove.id, true, false)
      closeRemoveModal()
      await fetchImages()
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : t('errorRemovingImage')
      setRemoveError(message)
    } finally {
      setActionLoading(null)
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
          <Layers className="w-6 h-6 text-(--color-primary)" />
          <div>
            <h2 className="text-2xl font-bold text-(--color-text-main)">{t('dockerImages')}</h2>
            <p className="text-(--color-text-muted) text-sm">{t('dockerImagesAvailable')}</p>
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
                  onClick={() => setSelectedHost('')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('backToInstances')}
                </Button>
                <div>
                  <h3 className="text-(--color-text-main) font-semibold text-lg">
                    {t('imagesOf')} {selectedInstanceData.hostname}
                  </h3>
                  <p className="text-(--color-text-muted) text-sm font-mono">{selectedInstanceData.service_id}</p>
                </div>
              </div>
              <Badge state={selectedInstanceData.status} />
            </div>

            <div className="flex flex-col md:flex-row gap-4 bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--color-text-muted)" />
                <input
                  type="text"
                  placeholder={t('searchImage')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-(--color-bg-base) border border-(--color-border) text-(--color-text-main) text-sm rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-(--color-primary)"
                />
              </div>
              <Button
                variant="primary"
                onClick={() => setShowPullModal(true)}
                className="flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                {t('searchImageButton')}
              </Button>
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('image')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('host')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('size')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('created')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('id')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-(--color-border)">
                       {filtered.map((image) => {
                        const isLoading = actionLoading === image.id
                        const instance = instances.find((i) => i.service_id === image.service_id)
                        const hostname = instance ? instance.hostname : image.hostname || 'Desconocido'
                        return (
                          <tr key={`${image.service_id}-${image.id}`} className="hover:bg-(--color-bg-surface-hover)/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-(--color-text-main) font-medium max-w-md truncate" title={getImageName(image)}>
                              {getImageName(image)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-(--color-text-secondary)">{hostname}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-(--color-text-secondary) text-sm">{formatBytes(image.size)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-(--color-text-secondary) text-sm">{timeAgo(image.created)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-(--color-text-muted) font-mono text-xs max-w-xs truncate" title={image.id}>
                              {image.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleUpdate(image)}
                                  disabled={isLoading}
                                  className="p-1.5 bg-(--color-bg-surface-hover) hover:bg-(--color-border) text-(--color-text-main) rounded-lg transition-colors disabled:opacity-50"
                                  title={`${t('update')} (pull)`}
                                >
                                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => handleRemove(image)}
                                  disabled={isLoading}
                                  className="p-1.5 bg-(--color-status-exited-subtle) hover:bg-(--color-status-exited)/20 text-(--color-status-exited) rounded-lg transition-colors disabled:opacity-50"
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
                          <td colSpan={6} className="px-6 py-8 text-center text-(--color-text-muted)">
                            {t('noImages')}
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
                  <Layers className="w-5 h-5 text-(--color-primary)" />
                  <span className="text-(--color-text-muted) text-sm">{t('manageImages')}</span>
                </div>

                <Button
                  variant="primary"
                  onClick={() => setSelectedHost(instance.service_id)}
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

      {showPullModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-(--color-text-main) font-semibold text-lg">{t('searchImageTitle')}</h3>
              <button onClick={closePullModal} className="text-(--color-text-muted) hover:text-(--color-text-main)">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="block text-(--color-text-muted) text-sm mb-1">{t('searchOnDockerHub')}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={t('searchImageExample')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 bg-(--color-bg-base) border border-(--color-border) text-(--color-text-main) text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-(--color-primary)"
                    />
                    <button
                      type="submit"
                      disabled={searching}
                      className="flex items-center gap-2 px-4 py-2 bg-(--color-primary) hover:bg-(--color-primary-hover) text-white text-sm rounded-lg transition-colors disabled:opacity-50 font-medium"
                    >
                      {searching && <Loader2 className="w-4 h-4 animate-spin" />}
                      <Search className="w-4 h-4" />
                      {t('search')}
                    </button>
                  </div>
                  <p className="text-(--color-text-muted) text-xs mt-1">{t('pressEnterToSearch')}</p>
                </div>
              </form>

              {searchError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
                  {searchError}
                </div>
              )}

              {hasSearched && !searching && searchResults.length === 0 && !searchError && (
                <div className="text-center text-(--color-text-muted) py-6">
                  {t('noSearchResults')}
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="border border-(--color-border) rounded-lg overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    {searchResults.map((result) => (
                      <button
                        key={result.name}
                        type="button"
                        onClick={() => selectSearchResult(result)}
                        className={`w-full text-left px-4 py-3 border-b border-(--color-border) last:border-b-0 hover:bg-(--color-bg-surface-hover) transition-colors ${
                          pullImageName.startsWith(result.name) ? 'bg-(--color-primary)/10 border-(--color-primary)/30' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-(--color-text-main)">{result.name}</span>
                          <div className="flex items-center gap-3 text-xs text-(--color-text-muted)">
                            {result.is_official && (
                              <span className="px-2 py-0.5 bg-(--color-status-info)/10 text-(--color-status-info) rounded-full">{t('official')}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              {result.star_count.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-(--color-text-secondary) text-sm mt-1 line-clamp-2">{result.description || t('noDescription')}</p>
                        <p className="text-(--color-text-muted) text-xs mt-1">
                          {t('pullCount')}: {result.pull_count.toLocaleString()} · {t('defaultTag')}: {result.default_tag}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handlePull} className="space-y-4 pt-2 border-t border-(--color-border)">
                <div>
                  <label className="block text-(--color-text-muted) text-sm mb-1">{t('imageToDownload')} (nombre:tag)</label>
                  <input
                    type="text"
                    placeholder={t('imageNameExample')}
                    value={pullImageName}
                    onChange={(e) => setPullImageName(e.target.value)}
                    className="w-full bg-(--color-bg-base) border border-(--color-border) text-(--color-text-main) text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-(--color-primary)"
                    required
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closePullModal}
                    className="px-4 py-2 bg-(--color-bg-surface-hover) hover:bg-(--color-border) text-(--color-text-main) text-sm rounded-lg transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={pulling || !pullImageName.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-(--color-primary) hover:bg-(--color-primary-hover) text-white text-sm rounded-lg transition-colors disabled:opacity-50 font-medium"
                  >
                    {pulling && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Download className="w-4 h-4" />
                    {t('download')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={imageToRemove !== null}
        title={t('removeImage')}
        message={imageToRemove ? t('removeImageConfirm').replace('{name}', getImageName(imageToRemove)) : ''}
        confirmText={t('remove')}
        cancelText={t('cancel')}
        onConfirm={confirmRemove}
        onCancel={closeRemoveModal}
        isLoading={actionLoading === imageToRemove?.id}
      >
        {removeError && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
            {removeError}
          </div>
        )}
      </ConfirmModal>
    </MainLayout>
  )
}
