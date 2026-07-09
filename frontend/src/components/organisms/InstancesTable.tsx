import { useNavigate } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { Badge } from '../atoms/Badge'
import { Button } from '../atoms/Button'
import { useLanguage } from '../../contexts/LanguageContext'
import type { ContainerSummary, Instance } from '../../types'
import { timeAgo } from '../../utils/time'

interface InstancesTableProps {
  instances: Instance[]
  containers: ContainerSummary[]
}

export function InstancesTable({ instances, containers }: InstancesTableProps) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const counts = instances.map((instance) => {
    const instanceContainers = containers.filter((c) => c.service_id === instance.service_id)
    return {
      ...instance,
      total: instanceContainers.length,
      running: instanceContainers.filter((c) => c.state === 'running').length,
    }
  })

  return (
    <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl overflow-hidden h-full flex flex-col">
      <div className="px-6 py-4 border-b border-(--color-border) flex items-center justify-between">
        <h3 className="text-(--color-text-main) font-semibold text-lg">
          {t('instanceOverview')} ({instances.length} {t('hostsRegistered')})
        </h3>
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full">
          <thead className="bg-(--color-bg-surface)">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('status')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('hostname')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('serviceID')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('containersCount')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('runningCount')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('lastHeartbeat')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--color-border)">
            {counts.map((instance) => (
              <tr key={instance.service_id} className="hover:bg-(--color-bg-surface-hover)/60 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge state={instance.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-(--color-text-main) font-medium">{instance.hostname}</td>
                <td className="px-6 py-4 whitespace-nowrap text-(--color-text-muted) font-mono text-sm">{instance.service_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-(--color-text-secondary)">{instance.total}</td>
                <td className="px-6 py-4 whitespace-nowrap text-(--color-status-running) font-medium">{instance.running}</td>
                <td className="px-6 py-4 whitespace-nowrap text-(--color-text-secondary)">{timeAgo(instance.last_seen)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/instances/${instance.service_id}`)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {t('viewDetails')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
