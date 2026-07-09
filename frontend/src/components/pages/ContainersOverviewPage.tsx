import { useNavigate } from 'react-router-dom'
import { Box, Container, Package, Ship, ArrowRight, Clock } from 'lucide-react'
import { MainLayout } from '../templates/MainLayout'
import { useLanguage } from '../../contexts/LanguageContext'

interface RuntimeCard {
  id: string
  name: string
  descriptionKey: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
  available: boolean
  routes: { labelKey: string; path: string; icon: React.ElementType }[]
}

export default function ContainersOverviewPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const runtimes: RuntimeCard[] = [
    {
      id: 'docker',
      name: 'Docker',
      descriptionKey: 'dockerDescription',
      icon: Container,
      color: 'text-(--color-primary)',
      bgColor: 'bg-(--color-primary-subtle)',
      borderColor: 'border-(--color-primary)/30',
      available: true,
      routes: [
        { labelKey: 'containers', path: '/containers/docker', icon: Box },
        { labelKey: 'images', path: '/containers/docker/images', icon: Package },
      ],
    },
    {
      id: 'podman',
      name: 'Podman',
      descriptionKey: 'podmanDescription',
      icon: Ship,
      color: 'text-(--color-status-warning)',
      bgColor: 'bg-(--color-status-warning-subtle)',
      borderColor: 'border-(--color-status-warning)/30',
      available: false,
      routes: [],
    },
  ]

  return (
    <MainLayout>
      <header className="h-20 bg-(--color-bg-surface)/90 backdrop-blur-sm border-b border-(--color-border) flex items-center justify-between px-8 sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-bold text-(--color-text-main)">{t('containers')}</h2>
          <p className="text-(--color-text-muted) text-sm">{t('selectContainerTechnology')}</p>
        </div>
      </header>

      <main className="flex-1 p-8 bg-(--color-bg-base)">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {runtimes.map((runtime) => {
            const Icon = runtime.icon
            return (
              <div
                key={runtime.id}
                className={`bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6 transition-all ${
                  runtime.available
                    ? 'hover:border-(--color-border-strong) hover:shadow-sm'
                    : 'opacity-75'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl ${runtime.bgColor} border ${runtime.borderColor} flex items-center justify-center`}
                    >
                      <Icon className={`w-6 h-6 ${runtime.color}`} />
                    </div>
                    <div>
                      <h3 className="text-(--color-text-main) font-semibold text-lg">{runtime.name}</h3>
                      {!runtime.available && (
                        <span className="inline-flex items-center gap-1 text-(--color-status-warning) text-xs font-medium">
                          <Clock className="w-3 h-3" />
                          {t('comingSoon')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-(--color-text-secondary) text-sm mb-6 min-h-[40px]">
                  {t(runtime.descriptionKey)}
                </p>

                {runtime.available ? (
                  <div className="space-y-2">
                    {runtime.routes.map((route) => {
                      const RouteIcon = route.icon
                      return (
                        <button
                          key={route.path}
                          onClick={() => navigate(route.path)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-(--color-bg-surface-hover) hover:bg-(--color-border) text-(--color-text-main) text-sm font-medium rounded-lg transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <RouteIcon className="w-4 h-4 text-(--color-text-muted)" />
                            {t(route.labelKey)}
                          </span>
                          <ArrowRight className="w-4 h-4 text-(--color-text-muted)" />
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-3 bg-(--color-bg-base) border border-(--color-border) rounded-lg text-center">
                    <span className="text-(--color-text-muted) text-sm">{t('notAvailable')}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </MainLayout>
  )
}
