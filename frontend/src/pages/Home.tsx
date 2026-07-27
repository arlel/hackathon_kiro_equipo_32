import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { GameFormat } from '@/types/game'

const FORMATS: { value: GameFormat; label: string; life: number }[] = [
  { value: 'commander', label: 'Commander', life: 40 },
  { value: '20vida', label: '20 Vida', life: 20 },
  { value: 'custom', label: 'Custom', life: 20 },
]

const ROOM_CODE_REGEX = /^[A-Z0-9]{6}$/

function isValidRoomCode(code: string): boolean {
  return ROOM_CODE_REGEX.test(code)
}

export default function Home() {
  const navigate = useNavigate()
  const { isAuthenticated, logout } = useAuth()

  // Room configuration state
  const [format, setFormat] = useState<GameFormat>('commander')
  const [poisonEnabled, setPoisonEnabled] = useState(false)
  const [turnCounterEnabled, setTurnCounterEnabled] = useState(false)
  const [customLife, setCustomLife] = useState(20)

  // Join room state
  const [roomCode, setRoomCode] = useState('')

  const startingLife = format === 'commander' ? 40 : format === '20vida' ? 20 : customLife

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleCreateRoom = () => {
    const code = generateCode()
    const params = new URLSearchParams({
      format,
      create: 'true',
      startingLife: String(startingLife),
      poisonEnabled: String(poisonEnabled),
      turnCounterEnabled: String(turnCounterEnabled),
    })
    navigate(`/game/${code}?${params.toString()}`)
  }

  const handleCreateLocalRoom = () => {
    if (!isAuthenticated) {
      const localRoomParams = new URLSearchParams({
        format,
        startingLife: String(startingLife),
        poisonEnabled: String(poisonEnabled),
        turnCounterEnabled: String(turnCounterEnabled),
      })
      navigate(`/login?redirect=${encodeURIComponent(`/local-game?${localRoomParams.toString()}`)}`)
      return
    }
    const params = new URLSearchParams({
      format,
      startingLife: String(startingLife),
      poisonEnabled: String(poisonEnabled),
      turnCounterEnabled: String(turnCounterEnabled),
    })
    navigate(`/local-game?${params.toString()}`)
  }

  const handleJoinRoom = () => {
    const normalized = roomCode.trim().toUpperCase()
    if (isValidRoomCode(normalized)) {
      navigate(`/game/${normalized}`)
    }
  }

  const handleRoomCodeChange = (value: string) => {
    // Allow only alphanumeric, convert to uppercase, max 6 chars
    const sanitized = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6)
    setRoomCode(sanitized)
  }

  const roomCodeValid = isValidRoomCode(roomCode)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-950 text-white">
      <h1 className="text-4xl font-bold text-purple-400 mb-2">⚔️ MTG Life Counter</h1>
      <p className="text-gray-400 mb-8">Contador de vidas con sincronización en tiempo real</p>

      <div className="w-full max-w-md space-y-6">
        {/* Create Room */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-100">Crear Sala</h2>

          {/* Format Selector */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Formato</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as GameFormat)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label} ({f.life} vida)
                </option>
              ))}
            </select>
          </div>

          {/* Custom Starting Life - shown only when Custom format selected */}
          {format === 'custom' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Vida inicial personalizada</label>
              <input
                type="number"
                min={1}
                value={customLife}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val) && val > 0) {
                    setCustomLife(val)
                  }
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}

          {/* Toggle: Poison Counters */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Contadores de veneno</span>
            <button
              type="button"
              role="switch"
              aria-checked={poisonEnabled}
              onClick={() => setPoisonEnabled(!poisonEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                poisonEnabled ? 'bg-purple-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  poisonEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Toggle: Turn Counter */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Contador de turnos</span>
            <button
              type="button"
              role="switch"
              aria-checked={turnCounterEnabled}
              onClick={() => setTurnCounterEnabled(!turnCounterEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                turnCounterEnabled ? 'bg-purple-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  turnCounterEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Create Buttons */}
          <button
            onClick={handleCreateRoom}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Crear Sala
          </button>

          <button
            onClick={handleCreateLocalRoom}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            🏠 Crear Sala Local
          </button>
          {!isAuthenticated && (
            <p className="text-xs text-gray-500 text-center">
              La sala local requiere iniciar sesión
            </p>
          )}
        </div>

        {/* Join Room */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-100">Unirse a Sala</h2>

          <div>
            <input
              type="text"
              placeholder="Código de sala (6 caracteres)"
              value={roomCode}
              onChange={(e) => handleRoomCodeChange(e.target.value)}
              className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-white placeholder-gray-500 uppercase focus:outline-none focus:ring-2 ${
                roomCode.length > 0 && !roomCodeValid
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-700 focus:ring-purple-500'
              }`}
              maxLength={6}
            />
            {roomCode.length > 0 && !roomCodeValid && (
              <p className="text-xs text-red-400 mt-1">
                El código debe tener exactamente 6 caracteres (A-Z, 0-9)
              </p>
            )}
          </div>

          <button
            onClick={handleJoinRoom}
            disabled={!roomCodeValid}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Unirse
          </button>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/history')}
            className="bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors text-sm"
          >
            📊 Historial
          </button>
          <button
            onClick={() => navigate('/stats')}
            className="bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors text-sm"
          >
            📈 Estadísticas
          </button>
          <button
            onClick={() => navigate('/decks')}
            className="bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors text-sm"
          >
            🃏 Mis Mazos
          </button>
          {isAuthenticated ? (
            <button
              onClick={logout}
              className="bg-gray-800 hover:bg-gray-700 text-red-400 py-2 rounded-lg transition-colors text-sm"
            >
              🚪 Cerrar Sesión
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors text-sm"
            >
              👤 Login
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
