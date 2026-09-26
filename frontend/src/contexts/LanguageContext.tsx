import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Language = 'es' | 'en'

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation()
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('orchestrack-language')
    if (saved === 'es' || saved === 'en') return saved
    return (i18n.language as Language) || 'es'
  })

  useEffect(() => {
    localStorage.setItem('orchestrack-language', language)
    i18n.changeLanguage(language)
  }, [language, i18n])

  const setLanguage = (lang: Language) => setLanguageState(lang)

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: (key) => t(key) as string }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
