import {
  LayoutDashboard,
  Settings,
  Server,
  Container,
  LogOut,
  Package,
  Bell,
  Cpu,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'

interface MenuItem {
  icon: React.ElementType
  label: string
  path: string
}

export function Sidebar() {
  const { t } = useLanguage()
  const { user, logout } = useAuth()
  const location = useLocation()

  const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: t('dashboard'), path: '/' },
    { icon: Server, label: t('instances'), path: '/instances' },
    { icon: Bell, label: t('alerts'), path: '/alerts' },
    { icon: Cpu, label: t('processes'), path: '/processes' },
    { icon: Package, label: t('packages'), path: '/packages' },
    { icon: Container, label: t('containers'), path: '/containers' },
    { icon: Settings, label: t('settings'), path: '/settings' },
  ]

  return (
    <aside className="w-64 bg-(--color-bg-surface) border-r border-(--color-border) h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-(--color-primary-subtle) rounded-xl flex items-center justify-center border border-(--color-primary)/30">
          <Container className="w-6 h-6 text-(--color-primary)" />
        </div>
        <h1 className="text-xl font-bold text-(--color-text-main) tracking-tight">Orchestrack</h1>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path)

          return (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.path === '/'}
              className={() =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-(--color-primary) text-white shadow-sm'
                    : 'text-(--color-text-muted) hover:bg-(--color-bg-surface-hover) hover:text-(--color-text-main)'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="p-4 border-t border-(--color-border)">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-(--color-bg-surface-hover) transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full bg-(--color-bg-surface-hover) overflow-hidden flex items-center justify-center">
            <span className="text-(--color-primary) text-sm font-bold">
              {user?.email.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-(--color-text-main) text-sm font-medium truncate">
              {user?.email || 'admin@orchestrack.io'}
            </p>
            <p className="text-(--color-text-muted) text-xs">{t('logout')}</p>
          </div>
          <LogOut className="w-4 h-4 text-(--color-text-muted)" />
        </button>
      </div>
    </aside>
  )
}
