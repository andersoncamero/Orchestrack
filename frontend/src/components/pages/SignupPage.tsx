import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { api } from '../../services/api'

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  )
}

export default function SignupPage() {
  const { t } = useLanguage()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'))
      return
    }

    setLoading(true)
    try {
      const data = await api.signUp(email, password)
      login(data.token, data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-(--color-bg-base) flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-[5%] left-[10%] w-96 h-96 rounded-full bg-(--color-primary)/15 blur-3xl" />
          <div className="absolute bottom-[10%] right-[5%] w-80 h-80 rounded-full bg-(--color-primary)/10 blur-3xl" />
          <div className="absolute top-[60%] left-[50%] w-64 h-64 rounded-full bg-[#3B82F6]/10 blur-3xl" />
        </div>

        <div className="relative max-w-md text-center">
          <img src="/logo-dark.png" alt="Orchestrack" className="h-[200px] w-auto mx-auto mb-8 drop-shadow-xl" />
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            {t('signupTagline')}
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            {t('signupDescription')}
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-3 mb-10 lg:hidden">
            <div className="w-20 h-20 rounded-2xl bg-[#0F172A] flex items-center justify-center shadow-lg">
              <img src="/logo-dark.png" alt="Orchestrack" className="h-14 w-auto" />
            </div>
            <h1 className="text-xl font-bold text-(--color-text-main)">Orchestrack</h1>
          </div>

          <h2 className="text-2xl font-semibold text-(--color-text-main) mb-1">
            {t('createAccount')}
          </h2>
          <p className="text-(--color-text-muted) mb-8">{t('signupSubtitle')}</p>

          {error && (
            <div className="mb-6 bg-(--color-status-exited-subtle) border border-(--color-status-exited)/30 text-(--color-status-exited) px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
              {error}
            </div>
          )}

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
                className="w-full px-4 py-3 bg-(--color-bg-surface) border border-(--color-border) rounded-lg text-(--color-text-main) placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50 focus:border-(--color-primary) transition-all"
                placeholder={t('emailPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-(--color-text-main) mb-1.5">
                {t('password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 bg-(--color-bg-surface) border border-(--color-border) rounded-lg text-(--color-text-main) placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50 focus:border-(--color-primary) transition-all"
                  placeholder={t('passwordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-(--color-text-muted) hover:text-(--color-text-main) transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-(--color-text-main) mb-1.5">
                {t('confirmPassword')}
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 bg-(--color-bg-surface) border border-(--color-border) rounded-lg text-(--color-text-main) placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50 focus:border-(--color-primary) transition-all"
                  placeholder={t('confirmPasswordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-(--color-text-muted) hover:text-(--color-text-main) transition-colors"
                  tabIndex={-1}
                  aria-label={showConfirm ? t('hidePassword') : t('showPassword')}
                >
                  <EyeIcon visible={showConfirm} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-(--color-primary) text-white rounded-lg font-medium hover:bg-(--color-primary-hover) disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              {loading ? t('signingUp') : t('signUp')}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-(--color-text-muted)">
            {t('alreadyHaveAccount')}{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-(--color-primary) font-medium hover:underline"
            >
              {t('login')}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
