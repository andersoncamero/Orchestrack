import { Play, RotateCcw, Square } from 'lucide-react'
import { Badge } from '../atoms/Badge'
import { Button } from '../atoms/Button'
import { useLanguage } from '../../contexts/LanguageContext'
import type { ContainerSummary } from '../../types'

interface ContainerRowProps {
  container: ContainerSummary
  onStart: (id: string) => void
  onStop: (id: string) => void
  onRestart: (id: string) => void
}

export function ContainerRow({ container, onStart, onStop, onRestart }: ContainerRowProps) {
  const { t } = useLanguage()
  const isRunning = container.state === 'running'

  return (
    <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-4 flex items-center justify-between hover:border-(--color-border-strong) transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h4 className="text-(--color-text-main) font-medium truncate">{container.name || container.id.slice(0, 12)}</h4>
          <Badge state={container.state} />
        </div>
        <p className="text-(--color-text-muted) text-sm mt-1 truncate">{container.image}</p>
      </div>

      <div className="flex items-center gap-2 ml-4">
        {!isRunning && (
          <Button variant="icon" onClick={() => onStart(container.id)} title={t('start')}>
            <Play className="w-4 h-4" />
          </Button>
        )}
        {isRunning && (
          <Button variant="icon" onClick={() => onStop(container.id)} title={t('stop')}>
            <Square className="w-4 h-4" />
          </Button>
        )}
        <Button variant="icon" onClick={() => onRestart(container.id)} title={t('restart')}>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
