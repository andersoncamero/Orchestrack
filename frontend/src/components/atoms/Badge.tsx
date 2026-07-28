import { useLanguage } from '../../contexts/LanguageContext'
import type { ContainerState } from '../../types'

interface BadgeProps {
  state: ContainerState | string
}

const stateStyles: Record<string, string> = {
  // Success / healthy / up
  running: 'bg-(--color-status-running-subtle) text-(--color-status-running) border-(--color-status-running)/30',
  healthy: 'bg-(--color-status-running-subtle) text-(--color-status-running) border-(--color-status-running)/30',
  up: 'bg-(--color-status-running-subtle) text-(--color-status-running) border-(--color-status-running)/30',

  // Warning / transient / degraded
  paused: 'bg-(--color-status-warning-subtle) text-(--color-status-warning) border-(--color-status-warning)/30',
  restarting: 'bg-(--color-status-warning-subtle) text-(--color-status-warning) border-(--color-status-warning)/30',
  warning: 'bg-(--color-status-warning-subtle) text-(--color-status-warning) border-(--color-status-warning)/30',

  // Error / down / dead / unhealthy / crash / oom
  exited: 'bg-(--color-status-exited-subtle) text-(--color-status-exited) border-(--color-status-exited)/30',
  dead: 'bg-(--color-status-exited-subtle) text-(--color-status-exited) border-(--color-status-exited)/30',
  down: 'bg-(--color-status-exited-subtle) text-(--color-status-exited) border-(--color-status-exited)/30',
  error: 'bg-(--color-status-exited-subtle) text-(--color-status-exited) border-(--color-status-exited)/30',
  unhealthy: 'bg-(--color-status-exited-subtle) text-(--color-status-exited) border-(--color-status-exited)/30',
  crashloopbackoff: 'bg-(--color-status-exited-subtle) text-(--color-status-exited) border-(--color-status-exited)/30',
  oomkilled: 'bg-(--color-status-exited-subtle) text-(--color-status-exited) border-(--color-status-exited)/30',

  // Info / created / removing / neutral / stopped
  created: 'bg-(--color-status-info-subtle) text-(--color-status-info) border-(--color-status-info)/30',
  removing: 'bg-(--color-status-neutral-subtle) text-(--color-status-neutral) border-(--color-status-neutral)/30',
  stopped: 'bg-(--color-status-neutral-subtle) text-(--color-status-neutral) border-(--color-status-neutral)/30',

  // Host connectivity
  online: 'bg-(--color-status-running-subtle) text-(--color-status-running) border-(--color-status-running)/30',
  offline: 'bg-(--color-status-exited-subtle) text-(--color-status-exited) border-(--color-status-exited)/30',
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
}

const stateTranslationKeys: Record<string, string> = {
  running: 'stateRunning',
  healthy: 'stateHealthy',
  up: 'stateUp',
  paused: 'statePaused',
  restarting: 'stateRestarting',
  warning: 'stateWarning',
  exited: 'stateExited',
  dead: 'stateDead',
  down: 'stateDown',
  error: 'stateError',
  unhealthy: 'stateUnhealthy',
  crashloopbackoff: 'stateCrashLoopBackOff',
  oomkilled: 'stateOOMKilled',
  stopped: 'stateStopped',
  created: 'stateCreated',
  removing: 'stateRemoving',
  online: 'stateRunning',
  offline: 'stateExited',
  pending: 'statePending',
}

export function Badge({ state }: BadgeProps) {
  const { t } = useLanguage()
  const safeState = state || 'unknown'
  const normalized = safeState.toLowerCase()
  const styles = stateStyles[normalized] || 'bg-(--color-status-neutral-subtle) text-(--color-status-neutral) border-(--color-status-neutral)/30'
  const labelKey = stateTranslationKeys[normalized] || 'stateUnknown'
  const label = t(labelKey)

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles}`}>
      {label}
    </span>
  )
}
