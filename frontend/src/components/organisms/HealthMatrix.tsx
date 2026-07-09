import { useLanguage } from '../../contexts/LanguageContext'
import type { HostMetrics } from '../../types'

interface HealthMatrixProps {
  metrics?: HostMetrics
}

interface MatrixRow {
  label: string
  value: number
  max: number
}

function getLevel(value: number, max: number): 'low' | 'medium' | 'high' {
  const percent = max > 0 ? (value / max) * 100 : 0
  if (percent > 80) return 'high'
  if (percent > 50) return 'medium'
  return 'low'
}

function levelColor(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high':
      return 'bg-(--color-status-exited) text-white'
    case 'medium':
      return 'bg-(--color-status-warning) text-white'
    default:
      return 'bg-(--color-status-running) text-white'
  }
}

export function HealthMatrix({ metrics }: HealthMatrixProps) {
  const { t } = useLanguage()

  if (!metrics) {
    return (
      <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6">
        <p className="text-(--color-text-muted)">{t('noData')}</p>
      </div>
    )
  }

  const rows: MatrixRow[] = [
    { label: t('cpu'), value: metrics.cpu_percent, max: 100 },
    { label: t('memory'), value: metrics.memory_percent, max: 100 },
    { label: t('disk'), value: metrics.disk_percent, max: 100 },
    { label: t('loadAverage'), value: metrics.cpu_cores > 0 ? (metrics.load_average / metrics.cpu_cores) * 100 : 0, max: 100 },
  ]

  const levels: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high']
  const levelLabels = {
    low: t('normal'),
    medium: t('warning'),
    high: t('critical'),
  }

  return (
    <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5">
      <h4 className="text-(--color-text-main) font-semibold mb-4">{t('healthMatrix')}</h4>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">{t('component')}</th>
              {levels.map((level) => (
                <th key={level} className="px-3 py-2 text-center text-xs font-medium text-(--color-text-muted) uppercase tracking-wider">
                  {levelLabels[level]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--color-border)">
            {rows.map((row) => {
              const activeLevel = getLevel(row.value, row.max)
              return (
                <tr key={row.label}>
                  <td className="px-3 py-3 text-(--color-text-main) font-medium text-sm">{row.label}</td>
                  {levels.map((level) => (
                    <td key={level} className="px-3 py-3 text-center">
                      {activeLevel === level ? (
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${levelColor(level)}`}>
                          {row.value.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs text-(--color-text-muted)">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
