import { useMemo, useState } from 'react'
import { DashboardTemplate } from '../templates/DashboardTemplate'
import { ClusterStatusPanel } from '../organisms/ClusterStatusPanel'
import { InstanceStatusCards } from '../organisms/InstanceStatusCards'
import { ConnectionHistoryChart } from '../organisms/ConnectionHistoryChart'
import { Spinner } from '../atoms/Spinner'
import { useInstances } from '../../hooks/useInstances'
import { useConnectionHistory } from '../../hooks/useConnectionHistory'
import { useLanguage } from '../../contexts/LanguageContext'
import { useWebSocket } from '../../hooks/useWebSocket'

export default function DashboardPage() {
  const { t } = useLanguage()
  const { instances, loading, error } = useInstances()
  const { samples: historySamples, loading: historyLoading, refetch: refetchHistory } = useConnectionHistory(720)
  const [selectedInstance, setSelectedInstance] = useState('all')

  useWebSocket({
    room: 'dashboard',
    onMessage: (message: any) => {
      if (message.type === 'instance.offline' || message.type === 'instance.online') {
        refetchHistory(true)
      }
    }
  })

  const displayedInstances = useMemo(() => {
    if (selectedInstance === 'all') return instances
    return instances.filter((i) => i.service_id === selectedInstance)
  }, [instances, selectedInstance])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="bg-status-exited-subtle border border-status-exited/30 text-status-exited px-6 py-4 rounded-xl">
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <DashboardTemplate
      title={t('dashboard')}
      subtitle={t('globalSystemStatus')}
      instances={instances}
      selectedInstance={selectedInstance}
      onSelectInstance={setSelectedInstance}
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ClusterStatusPanel instances={displayedInstances} />
          <ConnectionHistoryChart samples={historySamples} loading={historyLoading} />
        </div>

        <div className="space-y-4">
          <h3 className="text-text-main font-semibold text-lg">
            {t('monitoredMachines')} ({displayedInstances.length})
          </h3>
          <InstanceStatusCards instances={displayedInstances} />
        </div>
      </div>
    </DashboardTemplate>
  )
}
