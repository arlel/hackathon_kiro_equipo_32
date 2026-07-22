import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Register() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || 'Error al registrarse')
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
        />
        
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
          minLength={6}
        />

        <button
          type="submit"
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors"
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
