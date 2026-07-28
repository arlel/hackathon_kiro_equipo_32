import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from '@/services/api'
import { useTranslation } from '@/i18n/I18nContext'

// Returns a translation key for the first failing rule, or null if valid.
function validatePassword(password: string): string | null {
  if (password.length < 8) return 'register.errMinLength'
  if (!/[a-zA-Z]/.test(password)) return 'register.errNeedsLetter'
  if (!/[0-9]/.test(password)) return 'register.errNeedsNumber'
  if (!/[^a-zA-Z0-9]/.test(password)) return 'register.errNeedsSpecial'
  return null
}

export default function Register() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)

  const passwordError = passwordTouched ? validatePassword(password) : null
  const isFormValid = username.length >= 3 && email.includes('@') && !validatePassword(password)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const pwError = validatePassword(password)
    if (pwError) {
      setError(t(pwError))
      return
    }

    try {
      await register(username, email, password)
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.connectionError'))
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <form onSubmit={handleRegister} className="bg-[var(--color-bg-card)] rounded-xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t('register.title')}</h2>
          <button type="button" onClick={() => navigate('/')} className="text-sm text-gray-400 hover:text-white">
            ← {t('common.back')}
          </button>
        </div>
        
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <input
          type="text"
          placeholder={t('register.usernamePlaceholder')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
          required
          minLength={3}
          maxLength={50}
        />
        
        <input
          type="email"
          placeholder={t('register.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
          required
        />
        
        <div>
          <input
            type="password"
            placeholder={t('register.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setPasswordTouched(true)}
            className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-white placeholder-gray-500 ${
              passwordError ? 'border-red-500' : 'border-gray-700'
            }`}
            required
          />
          {passwordError && (
            <p className="text-xs text-red-400 mt-1">{t(passwordError)}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {t('register.passwordHint')}
          </p>
        </div>

        <button
          type="submit"
          disabled={!isFormValid}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {t('register.submit')}
        </button>

        <p className="text-center text-sm text-gray-400">
          {t('register.haveAccount')}{' '}
          <button type="button" onClick={() => navigate('/login')} className="text-purple-400 hover:underline">
            {t('register.login')}
          </button>
        </p>
      </form>
    </div>
  )
}
