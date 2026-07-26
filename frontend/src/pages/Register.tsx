import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Mínimo 8 caracteres'
  if (!/[a-zA-Z]/.test(password)) return 'Debe incluir al menos una letra'
  if (!/[0-9]/.test(password)) return 'Debe incluir al menos un número'
  if (!/[^a-zA-Z0-9]/.test(password)) return 'Debe incluir al menos un signo especial (!@#$...)'
  return null
}

export default function Register() {
  const navigate = useNavigate()
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
      setError(pwError)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        // Handle Pydantic validation errors
        if (data.detail && Array.isArray(data.detail)) {
          const msgs = data.detail.map((d: { msg?: string }) => d.msg || '').join('. ')
          setError(msgs || 'Error al registrarse')
        } else {
          setError(data.detail || 'Error al registrarse')
        }
        return
      }

      navigate('/login')
    } catch {
      setError('Error de conexión')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <form onSubmit={handleRegister} className="bg-[var(--color-bg-card)] rounded-xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Registrarse</h2>
          <button type="button" onClick={() => navigate('/')} className="text-sm text-gray-400 hover:text-white">
            ← Volver
          </button>
        </div>
        
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <input
          type="text"
          placeholder="Nombre de usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
          required
          minLength={3}
          maxLength={50}
        />
        
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
          required
        />
        
        <div>
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setPasswordTouched(true)}
            className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-white placeholder-gray-500 ${
              passwordError ? 'border-red-500' : 'border-gray-700'
            }`}
            required
          />
          {passwordError && (
            <p className="text-xs text-red-400 mt-1">{passwordError}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Mínimo 8 caracteres con letras, números y signos
          </p>
        </div>

        <button
          type="submit"
          disabled={!isFormValid}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          Crear Cuenta
        </button>

        <p className="text-center text-sm text-gray-400">
          ¿Ya tenés cuenta?{' '}
          <button type="button" onClick={() => navigate('/login')} className="text-purple-400 hover:underline">
            Ingresá
          </button>
        </p>
      </form>
    </div>
  )
}
