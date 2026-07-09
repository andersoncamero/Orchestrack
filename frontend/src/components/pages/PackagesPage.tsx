import { useCallback, useState } from 'react'
import { Package, Server, Eye, ArrowLeft, RefreshCw, Download, Search, AlertCircle } from 'lucide-react'
import { MainLayout } from '../templates/MainLayout'
import { Spinner } from '../atoms/Spinner'
import { Badge } from '../atoms/Badge'
import { Button } from '../atoms/Button'
import { PackagesTable } from '../organisms/PackagesTable'
import { ConfirmModal } from '../molecules/ConfirmModal'
import { useInstances } from '../../hooks/useInstances'
import { useSystemPackages } from '../../hooks/useSystemPackages'
import { useLanguage } from '../../contexts/LanguageContext'
import type { Instance, PackageManager } from '../../types'

const packageManagerNames: Record<string, string> = {
  unknown: 'Unknown',
  apt: 'APT',
  dnf: 'DNF',
  yum: 'YUM',
  pacman: 'Pacman',
  apk: 'APK',
  brew: 'Homebrew',
  choco: 'Chocolatey',
  winget: 'WinGet',
}

function getPackageManagerName(value: PackageManager | number | string | undefined): string {
  if (typeof value === 'number') {
    const names = ['Unknown', 'APT', 'DNF', 'YUM', 'Pacman', 'APK', 'Homebrew', 'Chocolatey', 'WinGet']
    return names[value] ?? 'Unknown'
  }
  if (typeof value === 'string') {
    return packageManagerNames[value] ?? value
  }
  return 'Unknown'
}

interface InstancePackagesDetailProps {
  instance: Instance
  onBack: () => void
}

function InstancePackagesDetail({ instance, onBack }: InstancePackagesDetailProps) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [upgradableOnly, setUpgradableOnly] = useState(false)
  const [showOutput, setShowOutput] = useState(false)
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set())
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [purgeRemove, setPurgeRemove] = useState(false)

  const {
    info,
    packagesResponse,
    loading: packagesLoading,
    actionLoading,
    error: packagesError,
    actionError,
    actionResult,
    fetchPackages,
    refreshPackages,
    upgradePackages,
    removePackages,
  } = useSystemPackages(instance.service_id)

  const handleSearch = () => {
    fetchPackages(query, upgradableOnly)
  }

  const handleRefresh = async () => {
    const result = await refreshPackages()
    if (result?.success) {
      fetchPackages(query, true)
    }
  }

  const handleUpgrade = async () => {
    const result = await upgradePackages(false, true)
    if (result?.success) {
      fetchPackages(query, upgradableOnly)
    }
  }

  const handleSelectPackage = useCallback((name: string, selected: boolean) => {
    setSelectedPackages((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(name)
      } else {
        next.delete(name)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected && packagesResponse) {
      setSelectedPackages(new Set(packagesResponse.packages.map((pkg) => pkg.name)))
    } else {
      setSelectedPackages(new Set())
    }
  }, [packagesResponse])

  const handleRemove = async () => {
    const result = await removePackages(Array.from(selectedPackages), purgeRemove, true)
    if (result?.success) {
      setSelectedPackages(new Set())
      setShowRemoveModal(false)
      setPurgeRemove(false)
      fetchPackages(query, upgradableOnly)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToInstances')}
          </Button>
          <div>
            <h3 className="text-(--color-text-main) font-semibold text-lg">
              {t('packagesOf')} {instance.hostname}
            </h3>
            <p className="text-(--color-text-muted) text-sm font-mono">{instance.service_id}</p>
          </div>
        </div>
        <Badge state={instance.status} />
      </div>

      {info && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-4">
            <p className="text-(--color-text-muted) text-xs font-medium uppercase tracking-wider">{t('platform')}</p>
            <p className="text-lg font-bold text-(--color-text-main) mt-1">{info.os}</p>
          </div>
          <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-4">
            <p className="text-(--color-text-muted) text-xs font-medium uppercase tracking-wider">{t('architecture')}</p>
            <p className="text-lg font-bold text-(--color-text-main) mt-1">{info.architecture}</p>
          </div>
          <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-4">
            <p className="text-(--color-text-muted) text-xs font-medium uppercase tracking-wider">{t('packageManager')}</p>
            <p className="text-lg font-bold text-(--color-text-main) mt-1">{getPackageManagerName(info.package_manager)}</p>
          </div>
          <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-4">
            <p className="text-(--color-text-muted) text-xs font-medium uppercase tracking-wider">{t('total')}</p>
            <p className="text-lg font-bold text-(--color-text-main) mt-1">
              {packagesLoading && !packagesResponse ? '-' : (packagesResponse?.total ?? 0)}
            </p>
          </div>
        </div>
      )}

      <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--color-text-muted)" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={t('searchPackage')}
                className="w-full pl-10 pr-4 py-2 bg-(--color-bg-base) border border-(--color-border) rounded-lg text-(--color-text-main) placeholder:text-(--color-text-muted) focus:outline-none focus:border-(--color-primary)"
              />
            </div>
            <Button onClick={handleSearch} className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              {t('search')}
            </Button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-(--color-text-secondary) text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={upgradableOnly}
                onChange={(e) => {
                  setUpgradableOnly(e.target.checked)
                  fetchPackages(query, e.target.checked)
                }}
                className="rounded border-(--color-border) bg-(--color-bg-base) text-(--color-primary) focus:ring-(--color-primary)"
              />
              {t('upgradableOnly')}
            </label>
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={actionLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
              {t('refreshPackages')}
            </Button>
            <Button
              onClick={handleUpgrade}
              disabled={actionLoading}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {t('upgradePackages')}
            </Button>
          </div>
        </div>
      </div>

      {(packagesError || actionError) && (
        <div className="bg-(--color-status-exited-subtle) border border-(--color-status-exited)/30 text-(--color-status-exited) px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{packagesError || actionError}</span>
        </div>
      )}

      {actionResult && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-(--color-text-main) font-semibold">{t('operationResult')}</h4>
            <Button variant="secondary" onClick={() => setShowOutput(!showOutput)}>
              {showOutput ? t('hideOutput') : t('showOutput')}
            </Button>
          </div>
          {showOutput && (
            <pre className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-4 text-xs text-(--color-text-secondary) font-mono overflow-x-auto max-h-96 overflow-y-auto">
              {actionResult.output}
            </pre>
          )}
        </div>
      )}

      <PackagesTable
        packages={packagesResponse?.packages ?? []}
        loading={packagesLoading}
        selectedPackages={selectedPackages}
        onSelectPackage={handleSelectPackage}
        onSelectAll={handleSelectAll}
        onRemove={() => setShowRemoveModal(true)}
      />

      <ConfirmModal
        isOpen={showRemoveModal}
        title={t('removePackages')}
        message={selectedPackages.size === 1 ? t('removePackagesConfirmSingular') : t('removePackagesConfirmPlural')}
        confirmText={t('remove')}
        cancelText={t('cancel')}
        onConfirm={handleRemove}
        onCancel={() => {
          setShowRemoveModal(false)
          setPurgeRemove(false)
        }}
        isLoading={actionLoading}
      >
        <div className="bg-(--color-status-warning)/10 border border-(--color-status-warning)/30 rounded-lg p-4 space-y-3">
          <p className="text-(--color-status-warning) text-sm font-medium">{t('removePackagesWarning')}</p>
          <label className="flex items-start gap-2 text-(--color-text-secondary) text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={purgeRemove}
              onChange={(e) => setPurgeRemove(e.target.checked)}
              className="mt-0.5 rounded border-(--color-border) bg-(--color-bg-base) text-(--color-primary) focus:ring-(--color-primary)"
            />
            <span>{t('purgePackages')}</span>
          </label>
          <p className="text-(--color-text-muted) text-xs">{purgeRemove ? t('purgeDescription') : t('removeDescription')}</p>
          <div className="max-h-32 overflow-y-auto text-xs text-(--color-text-secondary) font-mono bg-(--color-bg-base) rounded p-2">
            {Array.from(selectedPackages).map((name) => (
              <div key={name}>{name}</div>
            ))}
          </div>
        </div>
      </ConfirmModal>
    </div>
  )
}

export default function PackagesPage() {
  const { t } = useLanguage()
  const { instances, loading, error } = useInstances()
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null)

  const selectedInstanceData = instances.find((i) => i.service_id === selectedInstance) || null

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
      <header className="h-20 bg-(--color-bg-surface)/80 backdrop-blur-sm border-b border-(--color-border) flex items-center px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-(--color-primary)" />
          <div>
            <h2 className="text-2xl font-bold text-(--color-text-main)">{t('packages')}</h2>
            <p className="text-(--color-text-muted) text-sm">{t('packagesDescription')}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 bg-(--color-bg-base) space-y-8">
        {selectedInstanceData ? (
          <InstancePackagesDetail
            key={selectedInstanceData.service_id}
            instance={selectedInstanceData}
            onBack={() => setSelectedInstance(null)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                  <Package className="w-5 h-5 text-(--color-primary)" />
                  <span className="text-(--color-text-muted) text-sm">{t('managePackages')}</span>
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
    </MainLayout>
  )
}
