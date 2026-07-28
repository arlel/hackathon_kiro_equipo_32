import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n/I18nContext'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const redirectTo = searchParams.get('redirect') || '/'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      await login(email, password)
      navigate(redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.connectionError'))
      // Only clear password, keep email so user doesn't have to retype it
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <form onSubmit={handleLogin} className="bg-[var(--color-bg-card)] rounded-xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t('login.title')}</h2>
          <button type="button" onClick={() => navigate('/')} className="text-sm text-gray-400 hover:text-white">
            ← {t('common.back')}
          </button>
        </div>
        
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        
        <input
          type="email"
          placeholder={t('login.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
          required
        />
        
        <input
          type="password"
          placeholder={t('login.passwordPlaceholder')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? t('login.submitting') : t('login.submit')}
        </button>

        <p className="text-center text-sm text-gray-400">
          {t('login.noAccount')}{' '}
          <button type="button" onClick={() => navigate('/register')} className="text-purple-400 hover:underline">
            {t('login.register')}
          </button>
        </p>
      </form>
    </div>
  )
}
