import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '@/services/api'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      const data = await login(email, password)
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <form onSubmit={handleLogin} className="bg-[var(--color-bg-card)] rounded-xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Iniciar Sesión</h2>
          <button type="button" onClick={() => navigate('/')} className="text-sm text-gray-400 hover:text-white">
            ← Volver
          </button>
        </div>
        
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
          required
        />
        
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
          required
        />

        <button
          type="submit"
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          Ingresar
        </button>

        <p className="text-center text-sm text-gray-400">
          ¿No tenés cuenta?{' '}
          <button type="button" onClick={() => navigate('/register')} className="text-purple-400 hover:underline">
            Registrate
          </button>
        </p>
      </form>
    </div>
  )
}
