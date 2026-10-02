import { Link } from 'react-router-dom'
import { Menu, X, Globe, Sun, Moon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useTheme } from '../../contexts/ThemeContext'

export function AppBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('home')
  const [scrolled, setScrolled] = useState(false)
  const { t, language, setLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()

  const toggleLanguage = () => {
    setLanguage(language === 'es' ? 'en' : 'es')
  }

  const navItems = [
    { id: 'home', label: t('landingHome'), href: '#home' },
    { id: 'features', label: t('landingFeatures'), href: '#features' },
    { id: 'solutions', label: t('landingSolutions'), href: '#solutions' },
    { id: 'pricing', label: t('landingPricing'), href: '#pricing' },
    { id: 'about', label: t('landingAboutUs'), href: '#about' },
  ]

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
      const scrollPosition = window.scrollY + 200
      
      let currentActive = 'home'
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
    <>
      {/* Desktop Floating Island */}
      <nav className={`fixed z-50 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hidden md:flex justify-center w-full ${scrolled ? 'top-4' : 'top-8'}`}>
        <div className="relative group/nav">
          {/* Animated Glow Behind the Island */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-purple-500/30 to-primary/30 rounded-[40px] blur-xl opacity-0 group-hover/nav:opacity-50 transition-opacity duration-1000"></div>
          
          <div className="relative flex items-center h-[64px] bg-bg-surface/90 backdrop-blur-2xl border border-border shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-full px-6 gap-8">
            
            {/* Logo */}
            <a href="#" className="flex items-center gap-2 group transition-transform hover:scale-105 active:scale-95 cursor-pointer">
              <div className="relative flex items-center justify-center w-8 h-8 bg-gradient-to-tr from-primary to-purple-500 rounded-xl shadow-md">
                {/* Use the light logo for light mode and dark logo for dark mode, but inverted because the background of the logo box is a gradient */}
                <img src="/logo-dark.png" alt="O" className="w-5 h-5 object-contain invert brightness-0" />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-text-main">Orchestrack</span>
            </a>

            {/* Divider */}
            <div className="w-[1px] h-6 bg-border"></div>

            {/* Links */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <a 
                    key={item.id}
                    href={item.href} 
                    onClick={() => setActiveTab(item.id)}
                    className="relative px-5 py-2 rounded-full transition-all duration-300 group/link"
                  >
                    {/* Hover State Background */}
                    <div className={`absolute inset-0 rounded-full transition-colors duration-300 ${isActive ? 'bg-text-main/5' : 'group-hover/link:bg-text-main/5'}`}></div>
                    
                    <span className={`relative z-10 text-[14px] font-bold tracking-wide transition-colors duration-300 ${isActive ? 'text-text-main' : 'text-text-muted group-hover/link:text-text-main'}`}>
                      {item.label}
                    </span>

                    {/* Active Dot Indicator */}
                    <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary transition-all duration-500 shadow-[0_0_8px_var(--color-primary-focus)] ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div>
                  </a>
                )
              })}
            </div>

            {/* Divider */}
            <div className="w-[1px] h-6 bg-border"></div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-bg-base rounded-full p-1 border border-border">
                <button
                  onClick={toggleTheme}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-surface-hover text-text-muted hover:text-text-main transition-all shadow-sm"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button 
                  onClick={toggleLanguage}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-surface-hover text-text-muted hover:text-text-main transition-all shadow-sm font-bold text-[10px]"
                  title="Toggle Language"
                >
                  {language.toUpperCase()}
                </button>
              </div>
              
              <Link to="/login" className="px-4 py-2 text-[14px] font-bold text-text-muted hover:text-text-main transition-colors">
                {t('login')}
              </Link>
              <Link
                to="/signup"
                className="relative overflow-hidden group/btn bg-primary text-white px-6 py-2.5 rounded-full text-[14px] font-bold transition-transform active:scale-95 shadow-[0_4px_14px_var(--color-primary-focus)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-primary opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500 blur-sm"></div>
                <div className="absolute inset-0 bg-primary group-hover/btn:opacity-0 transition-opacity duration-300"></div>
                <span className="relative z-10 text-white transition-colors duration-300">{t('landingGetDemo')}</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile AppBar */}
      <nav className="md:hidden sticky top-0 z-50 w-full bg-bg-surface/90 backdrop-blur-2xl border-b border-border transition-all duration-300">
        <div className="px-4 flex justify-between items-center h-16">
          <a href="#" className="flex items-center gap-2">
            <img src="/logo-dark.png" alt="O" className="w-6 h-6 object-contain dark:block hidden" />
            <img src="/logo-light.png" alt="O" className="w-6 h-6 object-contain dark:hidden block" />
            <span className="text-lg font-extrabold tracking-tight text-text-main">Orchestrack</span>
          </a>
          
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-text-main/5 text-text-main"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 py-6 bg-bg-surface/95 backdrop-blur-3xl border-t border-border space-y-2">
            {navItems.map(item => (
              <a 
                key={item.id}
                href={item.href} 
                onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }}
                className={`flex items-center w-full px-5 py-4 rounded-2xl text-[15px] transition-all duration-300 ${activeTab === item.id ? 'bg-primary text-white font-bold shadow-lg shadow-primary/30' : 'font-semibold text-text-muted hover:text-text-main hover:bg-text-main/5'}`}
              >
                {item.label}
              </a>
            ))}
            
            <div className="pt-6 mt-4 flex gap-3">
              <button 
                onClick={toggleTheme}
                className="flex-1 flex justify-center items-center gap-2 py-4 rounded-2xl bg-text-main/5 text-[13px] font-bold text-text-main transition-all"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
              <button 
                onClick={toggleLanguage}
                className="flex-1 flex justify-center items-center gap-2 py-4 rounded-2xl bg-text-main/5 text-[13px] font-bold text-text-main transition-all"
              >
                <Globe className="w-4 h-4" />
                {language === 'es' ? 'EN' : 'ES'}
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
