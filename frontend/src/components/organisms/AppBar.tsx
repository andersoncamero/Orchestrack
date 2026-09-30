import { Link } from 'react-router-dom'
import { Menu, X, Globe, Sun, Moon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useTheme } from '../../contexts/ThemeContext'

export function AppBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('features')
  const { t, language, setLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()

  const toggleLanguage = () => {
    setLanguage(language === 'es' ? 'en' : 'es')
  }

  const navItems = [
    { id: 'features', label: t('landingFeatures'), href: '#features' },
    { id: 'solutions', label: t('landingSolutions'), href: '#solutions' },
    { id: 'pricing', label: t('landingPricing'), href: '#pricing' },
    { id: 'about', label: t('landingAboutUs'), href: '#about' },
  ]

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200
      
      let currentActive = 'features'
      for (let i = navItems.length - 1; i >= 0; i--) {
        const section = document.getElementById(navItems[i].id)
        if (section && section.offsetTop <= scrollPosition) {
          currentActive = navItems[i].id
          break
        }
      }
      setActiveTab(currentActive)
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <nav className="sticky top-0 z-50 w-full bg-bg-base/90 backdrop-blur-xl border-none transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo and Brand - Left */}
          <div className="flex items-center gap-2.5 w-48">
            <img src="/logo-dark.png" alt="Orchestrack" className="h-8 w-auto dark:block hidden" />
            <img src="/logo-light.png" alt="Orchestrack" className="h-8 w-auto dark:hidden block" />
            <span className="text-xl font-extrabold tracking-tight">Orchestrack</span>
          </div>

          {/* Desktop Menu - Center */}
          <div className="hidden md:flex items-center justify-center flex-1 h-full">
            <div className="flex items-center gap-4 h-full relative">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <a 
                    key={item.id}
                    href={item.href} 
                    onClick={() => setActiveTab(item.id)}
                    className="relative h-full flex items-center px-4 group transition-colors"
                  >
                    {/* Active Dropping Pill Indicator */}
                    {isActive && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[52px] h-[30px] bg-primary rounded-b-[20px] flex items-end justify-center pb-[6px] shadow-[0_8px_20px_var(--color-primary-focus)] transition-all animate-in slide-in-from-top-2 duration-300">
                        <div className="w-5 h-[3px] bg-white rounded-full opacity-90"></div>
                      </div>
                    )}
                    
                    <span className={`relative z-10 transition-colors duration-200 mt-1 text-[15px] ${isActive ? 'text-text-base font-bold' : 'text-text-muted font-medium group-hover:text-text-base'}`}>
                      {item.label}
                    </span>
                  </a>
                )
              })}
            </div>
          </div>

          {/* CTA Button & Actions - Right */}
          <div className="hidden md:flex items-center justify-end gap-5 w-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="w-10 h-10 flex items-center justify-center rounded-[14px] border border-black/5 dark:border-white/5 bg-bg-surface shadow-sm hover:shadow-md text-text-muted hover:text-primary transition-all"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button 
                onClick={toggleLanguage}
                className="w-10 h-10 flex items-center justify-center rounded-[14px] border border-black/5 dark:border-white/5 bg-bg-surface shadow-sm hover:shadow-md text-text-muted hover:text-primary transition-all font-bold text-[11px]"
                title={language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
              >
                {language.toUpperCase()}
              </button>
            </div>
            
            <Link to="/login" className="text-[15px] font-bold text-text-muted hover:text-text-base transition-colors ml-2">
              {t('login')}
            </Link>
            <Link
              to="/signup"
              className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-[14px] text-[15px] font-bold transition-all shadow-[0_4px_14px_var(--color-primary-focus)] hover:shadow-[0_6px_20px_var(--color-primary-focus)] hover:-translate-y-0.5 active:scale-95 ml-1"
            >
              {t('landingGetDemo')}
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-text-muted hover:text-text-base focus:outline-none w-10 h-10 flex items-center justify-center rounded-[14px] border border-black/5 dark:border-white/5 bg-bg-surface shadow-sm"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-black/5 dark:border-white/5 bg-bg-base/95 backdrop-blur-xl pb-4">
          <div className="px-4 pt-4 pb-3 space-y-2">
            {navItems.map(item => (
              <a 
                key={item.id}
                href={item.href} 
                onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }}
                className={`block px-4 py-3 rounded-xl text-base transition-colors ${activeTab === item.id ? 'bg-primary/10 text-primary font-bold' : 'font-medium text-text-muted hover:text-text-base hover:bg-bg-surface'}`}
              >
                {item.label}
              </a>
            ))}
            
            <div className="pt-4 mt-4 border-t border-black/5 dark:border-white/5 flex gap-3">
              <button 
                onClick={toggleTheme}
                className="flex-1 flex justify-center items-center gap-2 py-3 rounded-xl border border-black/5 dark:border-white/5 bg-bg-surface text-sm font-bold text-text-muted hover:text-primary transition-all shadow-sm"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
              <button 
                onClick={toggleLanguage}
                className="flex-1 flex justify-center items-center gap-2 py-3 rounded-xl border border-black/5 dark:border-white/5 bg-bg-surface text-sm font-bold text-text-muted hover:text-primary transition-all shadow-sm"
              >
                <Globe className="w-5 h-5" />
                {language === 'es' ? 'EN' : 'ES'}
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <Link to="/login" className="flex justify-center w-full px-4 py-3 text-base font-bold text-text-base bg-bg-surface border border-black/5 dark:border-white/5 rounded-xl shadow-sm">
                {t('login')}
              </Link>
              <Link to="/signup" className="flex justify-center w-full bg-primary text-white px-4 py-3 rounded-xl text-base font-bold shadow-[0_4px_14px_var(--color-primary-focus)]">
                {t('landingGetDemo')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
