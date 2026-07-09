import { useLanguage } from '../../contexts/LanguageContext'
import type { ContainerSummary } from '../../types'

interface StatusChartProps {
  containers: ContainerSummary[]
}

const colorVars: Record<string, string> = {
  running: '--color-status-running',
  exited: '--color-status-exited',
  created: '--color-status-info',
  paused: '--color-status-warning',
  restarting: '--color-status-warning',
  removing: '--color-status-neutral',
  dead: '--color-status-exited',
}

const stateTranslationKeys: Record<string, string> = {
  running: 'stateRunning',
  exited: 'stateExited',
  created: 'stateCreated',
  paused: 'statePaused',
  restarting: 'stateRestarting',
  removing: 'stateRemoving',
  dead: 'stateDead',
}

export function StatusChart({ containers }: StatusChartProps) {
  const { t } = useLanguage()
  const counts = containers.reduce((acc, container) => {
    const state = container.state || 'unknown'
    acc[state] = (acc[state] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const total = containers.length
  const states = Object.keys(counts).sort((a, b) => counts[b] - counts[a])

  if (total === 0) {
    return (
      <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6 flex items-center justify-center h-80">
        <p className="text-(--color-text-muted)">{t('noContainers')}</p>
      </div>
    )
  }

  const maxCount = Math.max(...Object.values(counts))

  return (
    <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-(--color-text-main) font-semibold text-lg">{t('containerStates')}</h3>
        <div className="text-right">
          <span className="block text-2xl font-bold text-(--color-text-main)">{total}</span>
          <span className="text-xs text-(--color-text-muted)">{t('total')}</span>
        </div>
      </div>

      <div className="flex-1 space-y-5">
        {states.map((state) => {
          const count = counts[state]
          const percentage = total > 0 ? (count / total) * 100 : 0
          const widthRelative = maxCount > 0 ? (count / maxCount) * 100 : 0
          const colorVar = colorVars[state] || '--color-status-neutral'
          const label = t(stateTranslationKeys[state] || 'stateUnknown')

          return (
            <div key={state}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: `var(${colorVar})` }}
                  />
                  <span className="text-(--color-text-main) font-medium capitalize">
                    {label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-(--color-text-main) font-semibold">{count}</span>
                  <span className="text-(--color-text-muted) w-12 text-right">
                    {Math.round(percentage)}%
                  </span>
                </div>
              </div>
              <div className="h-2.5 w-full bg-(--color-bg-base) rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${widthRelative}%`,
                    backgroundColor: `var(${colorVar})`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
