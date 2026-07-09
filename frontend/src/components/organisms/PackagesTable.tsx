import { memo, useMemo } from 'react'
import { Package, RefreshCw, ArrowUpCircle, Trash2 } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { formatBytes } from '../../utils/time'
import { Button } from '../atoms/Button'
import type { SystemPackage } from '../../types'

interface PackagesTableProps {
  packages: SystemPackage[]
  loading?: boolean
  selectedPackages?: Set<string>
  onSelectPackage?: (name: string, selected: boolean) => void
  onSelectAll?: (selected: boolean) => void
  onRemove?: () => void
}

function statusClass(status: string): string {
  const normalized = status.toLowerCase()
  if (normalized.includes('upgradable') || normalized.includes('update')) {
    return 'bg-(--color-status-warning)/10 text-(--color-status-warning) border-(--color-status-warning)/30'
  }
  return 'bg-(--color-status-running)/10 text-(--color-status-running) border-(--color-status-running)/30'
}

function statusIcon(status: string) {
  const normalized = status.toLowerCase()
  if (normalized.includes('upgradable') || normalized.includes('update')) {
    return <ArrowUpCircle className="w-3.5 h-3.5" />
  }
  return <Package className="w-3.5 h-3.5" />
}

interface PackageRowProps {
  pkg: SystemPackage
  selected: boolean
  onSelect: (name: string, selected: boolean) => void
}

const PackageRow = memo(function PackageRow({ pkg, selected, onSelect }: PackageRowProps) {
  const { t } = useLanguage()

  return (
    <tr className="hover:bg-(--color-bg-surface-hover)/50 transition-colors">
      <td className="px-6 py-3 whitespace-nowrap">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(pkg.name, e.target.checked)}
          className="rounded border-(--color-border) bg-(--color-bg-base) text-(--color-primary) focus:ring-(--color-primary)"
        />
      </td>
      <td className="px-6 py-3 whitespace-nowrap text-(--color-text-main) font-medium max-w-xs truncate" title={pkg.name}>
        {pkg.name}
      </td>
      <td className="px-6 py-3 whitespace-nowrap text-(--color-text-secondary) font-mono text-sm max-w-xs truncate" title={pkg.version}>
        {pkg.version}
      </td>
      <td className="px-6 py-3 whitespace-nowrap text-(--color-text-secondary) text-sm">
        {pkg.architecture || '-'}
      </td>
      <td className="px-6 py-3 whitespace-nowrap">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusClass(pkg.status)}`}>
          {statusIcon(pkg.status)}
          {pkg.status || t('installed')}
        </span>
      </td>
      <td className="px-6 py-3 whitespace-nowrap text-(--color-text-secondary) text-sm">
        {pkg.installed_size > 0 ? formatBytes(pkg.installed_size) : '-'}
      </td>
      <td className="px-6 py-3 whitespace-nowrap text-(--color-text-secondary) text-sm max-w-xs truncate" title={pkg.source}>
        {pkg.source || '-'}
      </td>
    </tr>
  )
})

export function PackagesTable({
  packages,
  loading,
  selectedPackages = new Set(),
  onSelectPackage,
  onSelectAll,
  onRemove,
}: PackagesTableProps) {
  const { t } = useLanguage()
  const hasSelection = selectedPackages.size > 0
  const allSelected = packages.length > 0 && packages.every((pkg) => selectedPackages.has(pkg.name))

  const selectedSet = useMemo(() => selectedPackages, [selectedPackages])

  if (loading) {
    return (
      <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-(--color-primary) animate-spin" />
      </div>
    )
  }

  if (packages.length === 0) {
    return (
      <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6">
        <p className="text-(--color-text-muted)">{t('noPackages')}</p>
      </div>
    )
  }

  return (
    <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl overflow-hidden">
      {hasSelection && onRemove && (
        <div className="px-6 py-3 border-b border-(--color-border) flex items-center justify-between bg-(--color-bg-surface-hover)/30">
          <span className="text-(--color-text-secondary) text-sm">
            {selectedPackages.size} {selectedPackages.size === 1 ? t('packageSelected') : t('packagesSelected')}
          </span>
          <Button variant="danger" onClick={onRemove} className="flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            {t('removeSelected')}
          </Button>
        </div>
      )}
      <div className="overflow-x-auto max-h-[40rem]">
        <table className="w-full">
          <thead className="bg-(--color-bg-surface)">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onSelectAll?.(e.target.checked)}
                  className="rounded border-(--color-border) bg-(--color-bg-base) text-(--color-primary) focus:ring-(--color-primary)"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('name')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('version')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('architecture')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('status')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('size')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('source')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--color-border)">
            {packages.map((pkg, index) => (
              <PackageRow
                key={`${pkg.name}-${pkg.version}-${pkg.architecture}-${index}`}
                pkg={pkg}
                selected={selectedSet.has(pkg.name)}
                onSelect={onSelectPackage ?? (() => {})}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
