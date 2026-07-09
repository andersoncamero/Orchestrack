import { useState } from 'react'
import { Bell, Globe, Info, LogOut, Search, Shield, Check } from 'lucide-react'
import { MainLayout } from '../templates/MainLayout'
import { useTheme } from '../../contexts/ThemeContext'
import { useLanguage } from '../../contexts/LanguageContext'

const tabs = ['General']

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()
  const [notifications, setNotifications] = useState(true)

  const darkMode = theme === 'dark'

  return (
    <MainLayout>
      <header className="h-20 bg-(--color-bg-surface)/80 backdrop-blur-sm border-b border-(--color-border) flex items-center justify-between px-8 sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-bold text-(--color-text-main)">{t('configuration')}</h2>
          <p className="text-(--color-text-muted) text-sm">{t('managePreferences')}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--color-text-muted)" />
            <input
              type="text"
              placeholder={`${t('search')}...`}
              className="bg-(--color-bg-surface) border border-(--color-border) text-(--color-text-main) text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-(--color-primary) w-48"
            />
          </div>
          <div className="w-10 h-10 rounded-full bg-(--color-primary)/20 flex items-center justify-center border border-(--color-primary)/30">
            <span className="text-(--color-primary) text-sm font-bold">A</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 bg-(--color-bg-base)">
        <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl overflow-hidden">
          <div className="border-b border-(--color-border) px-6">
            <nav className="flex gap-6">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  className="py-4 text-sm font-medium border-b-2 border-(--color-primary) text-(--color-primary) transition-colors"
                >
                  {t('general')}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6 space-y-8">
            <section>
              <h3 className="text-(--color-text-main) font-semibold mb-4">{t('basics')}</h3>
              <div className="divide-y divide-(--color-border) border border-(--color-border) rounded-xl overflow-hidden">
                <div className="p-4 flex items-center justify-between hover:bg-(--color-bg-surface-hover)/50 transition-colors">
                  <div>
                    <p className="text-(--color-text-main) font-medium">{t('profile')}</p>
                    <p className="text-(--color-text-muted) text-sm">{t('manageAccountInfo')}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-(--color-primary)/20 flex items-center justify-center border border-(--color-primary)/30">
                        <span className="text-(--color-primary) text-sm font-bold">A</span>
                      </div>
                      <div className="text-right">
                        <p className="text-(--color-text-main) text-sm font-medium">{t('administrator')}</p>
                        <p className="text-(--color-text-muted) text-xs">admin@orchestrack.io</p>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 bg-(--color-bg-surface-hover) hover:bg-(--color-border) text-(--color-text-main) text-sm rounded-lg transition-colors">
                      {t('edit')}
                    </button>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between hover:bg-(--color-bg-surface-hover)/50 transition-colors">
                  <div>
                    <p className="text-(--color-text-main) font-medium">{t('password')}</p>
                    <p className="text-(--color-text-muted) text-sm">{t('setPassword')}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-(--color-text-secondary) text-sm">********************</span>
                      <span className="flex items-center gap-1 text-(--color-primary) text-xs">
                        <Check className="w-3 h-3" />
                        {t('verySecure')}
                      </span>
                    </div>
                    <button className="px-3 py-1.5 bg-(--color-bg-surface-hover) hover:bg-(--color-border) text-(--color-text-main) text-sm rounded-lg transition-colors">
                      {t('edit')}
                    </button>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between hover:bg-(--color-bg-surface-hover)/50 transition-colors">
                  <div>
                    <p className="text-(--color-text-main) font-medium">{t('darkMode')}</p>
                    <p className="text-(--color-text-muted) text-sm">{t('useDarkTheme')}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-(--color-text-secondary) text-sm">{darkMode ? t('enabled') : t('disabled')}</span>
                    <button
                      onClick={toggleTheme}
                      className={`relative w-11 h-6 rounded-full transition-colors ${darkMode ? 'bg-(--color-primary)' : 'bg-slate-400'}`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-5' : ''}`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-(--color-text-main) font-semibold mb-4 flex items-center gap-2">
                <Bell className="w-4 h-4 text-(--color-primary)" />
                {t('notifications')}
              </h3>
              <div className="border border-(--color-border) rounded-xl overflow-hidden">
                <div className="p-4 flex items-center justify-between hover:bg-(--color-bg-surface-hover)/50 transition-colors">
                  <div>
                    <p className="text-(--color-text-main) font-medium">{t('enableNotifications')}</p>
                    <p className="text-(--color-text-muted) text-sm">{t('receiveAlerts')}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-(--color-text-secondary) text-sm">{notifications ? t('enabled') : t('disabled')}</span>
                    <button
                      onClick={() => setNotifications(!notifications)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${notifications ? 'bg-(--color-primary)' : 'bg-slate-400'}`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications ? 'translate-x-5' : ''}`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-(--color-text-main) font-semibold mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-(--color-primary)" />
                {t('language')}
              </h3>
              <div className="border border-(--color-border) rounded-xl overflow-hidden">
                <div className="p-4 flex items-center justify-between hover:bg-(--color-bg-surface-hover)/50 transition-colors">
                  <div>
                    <p className="text-(--color-text-main) font-medium">{t('interfaceLanguage')}</p>
                    <p className="text-(--color-text-muted) text-sm">{t('chooseLanguage')}</p>
                  </div>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'es' | 'en')}
                    className="bg-(--color-bg-surface) border border-(--color-border) text-(--color-text-main) text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-(--color-primary) min-w-[160px]"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-(--color-text-main) font-semibold mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-(--color-primary)" />
                {t('system')}
              </h3>
              <div className="border border-(--color-border) rounded-xl overflow-hidden">
                <div className="p-4 hover:bg-(--color-bg-surface-hover)/50 transition-colors">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-(--color-text-muted) text-sm mb-1">{t('version')}</p>
                      <p className="text-(--color-text-main) font-medium">0.1.0</p>
                    </div>
                    <div>
                      <p className="text-(--color-text-muted) text-sm mb-1">{t('backend')}</p>
                      <p className="text-(--color-text-main) font-medium">Go 1.25 + NATS</p>
                    </div>
                    <div>
                      <p className="text-(--color-text-muted) text-sm mb-1">{t('frontend')}</p>
                      <p className="text-(--color-text-main) font-medium">React + Tailwind</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-(--color-text-main) font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-(--color-primary)" />
                {t('session')}
              </h3>
              <div className="border border-(--color-border) rounded-xl overflow-hidden">
                <div className="p-4 flex items-center justify-between hover:bg-(--color-bg-surface-hover)/50 transition-colors">
                  <div>
                    <p className="text-(--color-text-main) font-medium">{t('closeSession')}</p>
                    <p className="text-(--color-text-muted) text-sm">{t('closeCurrentSession')}</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg transition-colors">
                    <LogOut className="w-4 h-4" />
                    {t('closeSession')}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </MainLayout>
  )
}
