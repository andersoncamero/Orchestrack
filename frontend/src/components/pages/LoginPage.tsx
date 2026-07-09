import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { api } from '../../services/api'

export default function LoginPage() {
  const { t } = useLanguage()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.login(email, password)
      login(data.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-(--color-bg-surface) border border-border rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary-subtle rounded-xl flex items-center justify-center border border-primary/30">
            <Container className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text-main tracking-tight">Orchestrack</h1>
        </div>

        <h2 className="text-xl font-semibold text-text-main text-center mb-2">
          {t('welcomeBack')}
        </h2>
        <p className="text-(--color-text-muted) text-center mb-6">{t('loginSubtitle')}</p>

        {error && (
          <div className="mb-4 bg-status-exited-subtle border border-status-exited/30 text-status-exited px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">
              {t('email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-bg-base border border-border rounded-xl text-text-main placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder={t('emailPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-main mb-1">
              {t('password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-bg-base border border-border rounded-xl text-text-main placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder={t('passwordPlaceholder')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? t('loggingIn') : t('login')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-(--color-text-muted)">
          {t('noAccount')}{' '}
          <button
            onClick={() => navigate('/signup')}
            className="text-primary font-medium hover:underline"
          >
            {t('signUp')}
          </button>
        </p>
      </div>
    </div>
  )
}
