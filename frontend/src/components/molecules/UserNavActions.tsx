import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Settings as SettingsIcon, LogOut } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { useAuth } from '../../contexts/AuthContext'
import NotificationDropdown from './NotificationDropdown'

export function UserNavActions() {
  const { t } = useLanguage()
  const { unreadCount } = useNotifications()
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initial = user?.email ? user.email.charAt(0).toUpperCase() : 'A'

  return (
    <div className="flex items-center gap-5">
      {/* Botón de Notificaciones con Badge Rojo */}
      <div className="relative">
        <button
          onClick={() => setIsNotifOpen(!isNotifOpen)}
          className="relative p-2 text-(--color-text-muted) hover:text-(--color-text-main) transition-colors rounded-xl hover:bg-(--color-bg-surface-hover) cursor-pointer"
          title={t('notifications')}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[9px] font-bold bg-(--color-status-exited) text-white rounded-full leading-none min-w-[16px] h-[16px] flex items-center justify-center shadow-sm">
              {unreadCount}
            </span>
          )}
        </button>
        {isNotifOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
            <NotificationDropdown onClose={() => setIsNotifOpen(false)} />
          </>
        )}
      </div>

      {/* Avatar de Usuario con Menú Desplegable */}
      <div className="relative" ref={userMenuRef}>
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="w-10 h-10 rounded-full bg-(--color-bg-surface-hover) overflow-hidden flex items-center justify-center border border-(--color-border) hover:border-(--color-primary) transition-colors cursor-pointer"
          title={user?.email || 'Usuario'}
        >
          <span className="text-(--color-primary) text-sm font-bold">{initial}</span>
        </button>
        {isUserMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-48 bg-(--color-bg-surface) border border-(--color-border) rounded-xl shadow-lg z-50 py-2 overflow-hidden">
              {user?.email && (
                <div className="px-4 py-2 border-b border-(--color-border)">
                  <p className="text-xs text-(--color-text-muted) truncate">{user.email}</p>
                </div>
              )}
              <button
                onClick={() => {
                  navigate('/settings')
                  setIsUserMenuOpen(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-(--color-text-main) hover:bg-(--color-bg-surface-hover) transition-colors text-left cursor-pointer"
              >
                <SettingsIcon className="w-4 h-4 text-(--color-text-muted)" />
                {t('settings')}
              </button>
              <div className="border-t border-(--color-border) mx-3 my-1" />
              <button
                onClick={() => {
                  logout()
                  setIsUserMenuOpen(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-(--color-status-exited) hover:bg-(--color-bg-surface-hover) transition-colors text-left cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                {t('logout')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
