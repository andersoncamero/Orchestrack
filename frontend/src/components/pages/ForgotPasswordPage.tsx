import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'

export default function ForgotPasswordPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // TODO: integrate with backend endpoint POST /api/v1/forgot-password
    await new Promise((r) => setTimeout(r, 1500))
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-(--color-bg-base) flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-10">
          <img src="/logo-dark.png" alt="Orchestrack" className="h-12 w-auto dark:block hidden" />
          <img src="/logo-light.png" alt="Orchestrack" className="h-12 w-auto dark:hidden block" />
          <h1 className="text-xl font-bold text-(--color-text-main)">Orchestrack</h1>
        </div>

        <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-8 shadow-sm">
          {sent ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-(--color-status-running-subtle) flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-status-running)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2 11 13" />
                    <path d="m22 2-7 20-4-9-9-4 20-7z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-(--color-text-main) text-center mb-2">
                {t('checkYourEmail')}
              </h2>
              <p className="text-(--color-text-muted) text-center text-sm mb-6">
                {t('resetEmailSent')}
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-(--color-primary) text-white rounded-lg font-medium hover:bg-(--color-primary-hover) transition-all"
              >
                {t('backToLogin')}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-(--color-text-main) mb-1">
                {t('forgotPasswordTitle')}
              </h2>
              <p className="text-(--color-text-muted) text-sm mb-6">
                {t('forgotPasswordSubtitle')}
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-(--color-text-main) mb-1.5">
                    {t('email')}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-(--color-bg-base) border border-(--color-border) rounded-lg text-(--color-text-main) placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50 focus:border-(--color-primary) transition-all"
                    placeholder={t('emailPlaceholder')}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-(--color-primary) text-white rounded-lg font-medium hover:bg-(--color-primary-hover) disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? t('sending') : t('sendInstructions')}
                </button>
              </form>
            </>
          )}
        </div>

        {!sent && (
          <p className="mt-6 text-center text-sm text-(--color-text-muted)">
            <button
              onClick={() => navigate('/login')}
              className="text-(--color-primary) font-medium hover:underline inline-flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
              {t('backToLogin')}
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
