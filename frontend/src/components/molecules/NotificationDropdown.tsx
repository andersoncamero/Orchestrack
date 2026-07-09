import { AlertTriangle, ServerOff, Cpu, MemoryStick, HardDrive, Activity, CheckCircle2, Eye } from 'lucide-react'
import { useNotifications } from '../../contexts/NotificationContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { timeAgo } from '../../utils/time'
import { Link } from 'react-router-dom'

interface NotificationDropdownProps {
  onClose: () => void
}

const severityStyles = {
  critical: {
    border: 'border-status-exited/30',
    bg: 'bg-status-exited-subtle/40',
    iconBg: 'bg-status-exited',
    text: 'text-status-exited',
    icon: ServerOff,
  },
  warning: {
    border: 'border-status-warning/30',
    bg: 'bg-status-warning-subtle/40',
    iconBg: 'bg-status-warning',
    text: 'text-status-warning',
    icon: AlertTriangle,
  },
  info: {
    border: 'border-status-info/30',
    bg: 'bg-status-info-subtle/40',
    iconBg: 'bg-status-info',
    text: 'text-status-info',
    icon: Activity,
  },
}

export default function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { t } = useLanguage()
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications()

  return (
    <div className="absolute right-0 mt-3 w-96 max-w-[calc(100vw-2rem)] bg-bg-surface/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-4 z-50 text-left animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-bold text-text-main text-base">{t('notifications')}</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-primary text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
          >
            {t('markAllAsRead')}
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="my-3 space-y-2.5 max-h-80 overflow-y-auto pr-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-status-running-subtle flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-status-running" />
            </div>
            <p className="text-text-muted text-sm font-medium">{t('noNotifications')}</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const styles = severityStyles[notification.severity]
            const Icon = notification.id.includes('-offline') ? ServerOff :
                         notification.id.includes('-cpu') ? Cpu :
                         notification.id.includes('-memory') ? MemoryStick :
                         notification.id.includes('-disk') ? HardDrive :
                         styles.icon

            return (
              <div
                key={notification.id}
                onClick={() => !notification.read && markAsRead(notification.id)}
                className={`group relative flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  styles.border
                } ${styles.bg} ${notification.read ? 'opacity-60 saturate-50 hover:opacity-100 hover:saturate-100' : 'hover:scale-[1.01] hover:shadow-md'}`}
              >
                <div className={`w-9 h-9 rounded-lg ${styles.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-text-main font-medium text-xs leading-snug">{notification.message}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${styles.text}`}>
                      {notification.host}
                    </p>
                    <p className="text-text-muted text-[10px]">{timeAgo(notification.timestamp)}</p>
                  </div>
                </div>

                {/* Mark as read button (individual) */}
                {!notification.read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      markAsRead(notification.id)
                    }}
                    className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-text-muted hover:text-primary rounded"
                    title={t('markAllAsRead')}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-border">
        <Link
          to="/alerts"
          onClick={onClose}
          className="flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-text-muted hover:text-text-main transition-colors w-full bg-bg-base hover:bg-border/20 rounded-xl"
        >
          <Eye className="w-3.5 h-3.5" />
          {t('viewDetails')}
        </Link>
      </div>
    </div>
  )
}
