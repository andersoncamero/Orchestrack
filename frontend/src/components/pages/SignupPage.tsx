import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { api } from '../../services/api'

export default function SignupPage() {
  const { t } = useLanguage()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    <div className="min-h-screen bg-(--color-bg-base) flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-(--color-bg-surface) border border-(--color-border) rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-(--color-primary-subtle) rounded-xl flex items-center justify-center border border-(--color-primary)/30">
            <Container className="w-7 h-7 text-(--color-primary)" />
          </div>
          <h1 className="text-2xl font-bold text-(--color-text-main) tracking-tight">Orchestrack</h1>
        </div>

        <h2 className="text-xl font-semibold text-(--color-text-main) text-center mb-2">
          {t('createAccount')}
        </h2>
        <p className="text-(--color-text-muted) text-center mb-6">{t('signupSubtitle')}</p>

        {error && (
          <div className="mb-4 bg-(--color-status-exited-subtle) border border-(--color-status-exited)/30 text-(--color-status-exited) px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-(--color-text-main) mb-1">
              {t('email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-(--color-bg-base) border border-(--color-border) rounded-xl text-(--color-text-main) placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50"
              placeholder={t('emailPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-(--color-text-main) mb-1">
              {t('password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-(--color-bg-base) border border-(--color-border) rounded-xl text-(--color-text-main) placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50"
              placeholder={t('passwordPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-(--color-text-main) mb-1">
              {t('confirmPassword')}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-(--color-bg-base) border border-(--color-border) rounded-xl text-(--color-text-main) placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50"
              placeholder={t('confirmPasswordPlaceholder')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-(--color-primary) text-white rounded-xl font-medium hover:bg-(--color-primary)/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? t('signingUp') : t('signUp')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-(--color-text-muted)">
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
  )
}
