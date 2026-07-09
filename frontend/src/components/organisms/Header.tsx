import { useState } from 'react'
import { Bell, ChevronDown } from 'lucide-react'
import type { Instance } from '../../types'
import { useLanguage } from '../../contexts/LanguageContext'
import { useNotifications } from '../../contexts/NotificationContext'
import NotificationDropdown from '../molecules/NotificationDropdown'

interface HeaderProps {
  title: string
  subtitle?: string
  instances: Instance[]
  selectedInstance: string
  onSelectInstance: (id: string) => void
}

export function Header({ title, subtitle, instances, selectedInstance, onSelectInstance }: HeaderProps) {
  const { t } = useLanguage()
  const { unreadCount } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="h-20 bg-(--color-bg-surface)/90 backdrop-blur-sm border-b border-(--color-border) flex items-center justify-between px-8 sticky top-0 z-10">
      <div>
        <h2 className="text-2xl font-bold text-(--color-text-main)">{title}</h2>
        {subtitle && <p className="text-(--color-text-muted) text-sm mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-(--color-text-muted) font-medium">{t('instance')}</span>
          <div className="relative">
            <select
              value={selectedInstance}
              onChange={(e) => onSelectInstance(e.target.value)}
              className="appearance-none bg-(--color-bg-surface) border border-(--color-border) text-(--color-text-main) text-sm rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-(--color-primary) min-w-[220px]"
            >
              <option value="all">{t('allCluster')} ({instances.length} {t('hosts')})</option>
              {instances.map((instance) => (
                <option key={instance.service_id} value={instance.service_id}>
                  {instance.hostname}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-(--color-text-muted) absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative p-2 text-(--color-text-muted) hover:text-(--color-text-main) transition-colors rounded-xl hover:bg-(--color-bg-surface-hover)"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[9px] font-bold bg-(--color-status-exited) text-white rounded-full leading-none min-w-[16px] h-[16px] flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {isOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
              <NotificationDropdown onClose={() => setIsOpen(false)} />
            </>
          )}
        </div>

        <div className="w-10 h-10 rounded-full bg-(--color-bg-surface-hover) overflow-hidden flex items-center justify-center border border-(--color-border)">
          <span className="text-(--color-primary) text-sm font-bold">A</span>
        </div>
      </div>
    </header>
  )
}

