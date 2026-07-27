import {
  LayoutDashboard,
  Server,
  Container,
  Package,
  Bell,
  Cpu,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'

interface MenuItem {
  icon: React.ElementType
  label: string
  path: string
}

export function Sidebar() {
  const { t } = useLanguage()
  const location = useLocation()

  const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: t('dashboard'), path: '/dashboard' },
    { icon: Server, label: t('instances'), path: '/instances' },
    { icon: Bell, label: t('alerts'), path: '/alerts' },
    { icon: Cpu, label: t('processes'), path: '/processes' },
    { icon: Package, label: t('packages'), path: '/packages' },
    { icon: Container, label: t('containers'), path: '/containers' },
  ]

  return (
    <aside className="w-64 bg-(--color-bg-surface) border-r border-(--color-border) h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 flex flex-col items-center gap-2">
        <img src="/logo-dark.png" alt="Orchestrack" className="h-[48px] w-auto dark:block hidden" />
        <img src="/logo-light.png" alt="Orchestrack" className="h-[48px] w-auto dark:hidden block" />
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
    </aside>
  )
}
