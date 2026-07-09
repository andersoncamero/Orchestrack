import { useLanguage } from '../../contexts/LanguageContext'
import { GaugeChart } from './GaugeChart'
import type { Instance } from '../../types'

interface ClusterResourceGaugesProps {
  instances: Instance[]
}

function average(metrics: number[]): number {
  if (metrics.length === 0) return 0
  return metrics.reduce((a, b) => a + b, 0) / metrics.length
}

export function ClusterResourceGauges({ instances }: ClusterResourceGaugesProps) {
  const { t } = useLanguage()
  const withMetrics = instances.filter((i) => i.host_metrics)

  const avgCpu = average(withMetrics.map((i) => i.host_metrics!.cpu_percent))
  const avgMem = average(withMetrics.map((i) => i.host_metrics!.memory_percent))
  const avgDisk = average(withMetrics.map((i) => i.host_metrics!.disk_percent))

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <GaugeChart value={avgCpu} label={t('avgCpuUsage')} />
      <GaugeChart value={avgMem} label={t('avgMemoryUsage')} />
      <GaugeChart value={avgDisk} label={t('avgDiskUsage')} />
    </div>
  )
}
