import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Play, RotateCcw, Square, Save, Trash2 } from 'lucide-react'
import { MainLayout } from '../templates/MainLayout'
import { Spinner } from '../atoms/Spinner'
import { Badge } from '../atoms/Badge'
import { ConfirmModal } from '../molecules/ConfirmModal'
import { useInstances } from '../../hooks/useInstances'
import { useLanguage } from '../../contexts/LanguageContext'
import { api } from '../../services/api'
import { timeAgo } from '../../utils/time'
import type { Container } from '../../types'

export default function ContainerDetailPage() {
  const { serviceId, id } = useParams<{ serviceId: string; id: string }>()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { instances, loading: loadingInstances } = useInstances()

  const [container, setContainer] = useState<Container | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [removeLoading, setRemoveLoading] = useState(false)

  const instance = instances.find((i) => i.service_id === serviceId)

  const fetchContainer = async () => {
    if (!serviceId || !id) return
    setLoading(true)
    try {
      const data = await api.getContainer(serviceId, id)
      setContainer(data.container)
      setNewName(data.container.name)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContainer()
  }, [serviceId, id])

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    if (!serviceId || !id) return
    setActionLoading(true)
    try {
      if (action === 'start') await api.startContainer(serviceId, id)
      if (action === 'stop') await api.stopContainer(serviceId, id)
      if (action === 'restart') await api.restartContainer(serviceId, id)
      await fetchContainer()
    } catch (err) {
      console.error(err)
      alert(action === 'start' ? t('errorStartingContainer') : action === 'stop' ? t('errorStoppingContainer') : t('errorRestartingContainer'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!serviceId || !id || !newName.trim() || newName === container?.name) return
    setSavingName(true)
    try {
      await api.renameContainer(serviceId, id, newName.trim())
      await fetchContainer()
    } catch (err) {
      console.error(err)
      alert(t('errorRenamingContainer'))
    } finally {
      setSavingName(false)
    }
  }

  const confirmRemove = async () => {
    if (!serviceId || !id) return
    setRemoveLoading(true)
    try {
      await api.removeContainer(serviceId, id, true, false)
      navigate('/containers')
    } catch (err) {
      console.error(err)
      alert(t('errorRemovingContainer'))
      setRemoveLoading(false)
    }
  }

  if (loadingInstances || loading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </MainLayout>
    )
  }

  if (!container || !instance) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-6 py-4 rounded-xl">
            {t('containerNotFound')}
          </div>
        </div>
      </MainLayout>
    )
  }

  const isRunning = container.state === 'running'
  const envList = container.env || []
  const portsList = container.ports || []
  const volumesList = container.volumes || []
  const labelsList = container.labels || []

  return (
    <MainLayout>
      <header className="h-20 bg-(--color-bg-surface)/80 backdrop-blur-sm border-b border-(--color-border) flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link
            to="/containers/docker"
            className="p-2 bg-(--color-bg-surface) hover:bg-(--color-bg-surface-hover) text-(--color-text-secondary) rounded-lg transition-colors border border-(--color-border)"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-(--color-text-main)">{container.name}</h2>
            <p className="text-(--color-text-muted) text-sm">{instance.hostname} · ID: {container.id.slice(0, 12)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge state={container.state} />
          <button
            onClick={() => setShowRemoveModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-(--color-status-exited-subtle) hover:bg-(--color-status-exited)/20 text-(--color-status-exited) text-sm rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t('remove')}
          </button>
        </div>
      </header>

      <main className="flex-1 p-8 bg-(--color-bg-base) space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          {!isRunning && (
            <button
              onClick={() => handleAction('start')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-(--color-primary) hover:bg-(--color-primary-hover) text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              {t('start')}
            </button>
          )}
          {isRunning && (
            <button
              onClick={() => handleAction('stop')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Square className="w-4 h-4" />
              {t('stop')}
            </button>
          )}
          <button
            onClick={() => handleAction('restart')}
            disabled={actionLoading}
            className="flex items-center gap-2 px-4 py-2 bg-(--color-bg-surface-hover) hover:bg-(--color-border) text-(--color-text-main) text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            {t('restart')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6 space-y-4">
            <h3 className="text-(--color-text-main) font-semibold text-lg">{t('general')}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-(--color-border) pb-2">
                <span className="text-(--color-text-muted)">{t('id')}</span>
                <span className="text-(--color-text-main) font-mono">{container.id}</span>
              </div>
              <div className="flex justify-between border-b border-(--color-border) pb-2">
                <span className="text-(--color-text-muted)">{t('image')}</span>
                <span className="text-(--color-text-main)">{container.image}</span>
              </div>
              <div className="flex justify-between border-b border-(--color-border) pb-2">
                <span className="text-(--color-text-muted)">{t('state')}</span>
                <Badge state={container.state} />
              </div>
              <div className="flex justify-between border-b border-(--color-border) pb-2">
                <span className="text-(--color-text-muted)">{t('created')}</span>
                <span className="text-(--color-text-main)">{timeAgo(container.created)}</span>
              </div>
              <div className="flex justify-between border-b border-(--color-border) pb-2">
                <span className="text-(--color-text-muted)">{t('command')}</span>
                <span className="text-(--color-text-main) font-mono">{container.command} {container.args?.join(' ') || ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-(--color-text-muted)">{t('autoRemove')}</span>
                <span className="text-(--color-text-main)">{container.auto_remove ? t('enabled') : t('disabled')}</span>
              </div>
            </div>
          </div>

          <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6 space-y-4">
            <h3 className="text-(--color-text-main) font-semibold text-lg">{t('edit')}</h3>
            <form onSubmit={handleRename} className="space-y-3">
              <div>
                <label className="block text-(--color-text-muted) text-sm mb-1">{t('name')}</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-(--color-bg-surface) border border-(--color-border) text-(--color-text-main) text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-(--color-primary)"
                />
              </div>
              <button
                type="submit"
                disabled={savingName || !newName.trim() || newName === container.name}
                className="flex items-center gap-2 px-4 py-2 bg-(--color-primary) hover:bg-(--color-primary-hover) text-white text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {savingName && <Spinner size="sm" />}
                <Save className="w-4 h-4" />
                {t('rename')}
              </button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6 space-y-4">
            <h3 className="text-(--color-text-main) font-semibold text-lg">{t('environmentVariables')}</h3>
            {envList.length === 0 ? (
              <p className="text-(--color-text-muted) text-sm">{t('noData')}</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {envList.map((env, index) => (
                  <div key={index} className="text-sm font-mono text-(--color-text-secondary) border-b border-(--color-border) pb-2 last:border-0">
                    <span className="text-(--color-primary)">{env.key}</span>=<span>{env.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6 space-y-4">
            <h3 className="text-(--color-text-main) font-semibold text-lg">{t('ports')}</h3>
            {portsList.length === 0 ? (
              <p className="text-(--color-text-muted) text-sm">{t('noData')}</p>
            ) : (
              <div className="space-y-2">
                {portsList.map((port, index) => (
                  <div key={index} className="flex justify-between text-sm border-b border-(--color-border) pb-2 last:border-0">
                    <span className="text-(--color-text-muted)">{port.ip || '0.0.0.0'}</span>
                    <span className="text-(--color-text-main) font-mono">{port.public_port}:{port.private_port}/{port.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6 space-y-4">
            <h3 className="text-(--color-text-main) font-semibold text-lg">{t('volumes')}</h3>
            {volumesList.length === 0 ? (
              <p className="text-(--color-text-muted) text-sm">{t('noData')}</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {volumesList.map((volume, index) => (
                  <div key={index} className="text-sm border-b border-(--color-border) pb-2 last:border-0">
                    <div className="text-(--color-text-main) font-mono">{volume.source} → {volume.target}</div>
                    <div className="text-(--color-text-muted) text-xs">{volume.type} {volume.read_only && '· solo lectura'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6 space-y-4">
            <h3 className="text-(--color-text-main) font-semibold text-lg">{t('labels')}</h3>
            {labelsList.length === 0 ? (
              <p className="text-(--color-text-muted) text-sm">{t('noData')}</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {labelsList.map((label, index) => (
                  <div key={index} className="text-sm font-mono text-(--color-text-secondary) border-b border-(--color-border) pb-2 last:border-0">
                    <span className="text-blue-400">{label.key}</span>=<span>{label.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <ConfirmModal
        isOpen={showRemoveModal}
        title={t('removeContainer')}
        message={t('removeContainerConfirm').replace('{name}', container.name)}
        confirmText={t('remove')}
        cancelText={t('cancel')}
        onConfirm={confirmRemove}
        onCancel={() => setShowRemoveModal(false)}
        isLoading={removeLoading}
      />
    </MainLayout>
  )
}
