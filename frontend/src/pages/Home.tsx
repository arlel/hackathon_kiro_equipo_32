import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { GameFormat } from '@/types/game'

const FORMATS: { value: GameFormat; label: string; life: number }[] = [
  { value: 'commander', label: 'Commander', life: 40 },
  { value: 'standard', label: 'Standard', life: 20 },
  { value: 'modern', label: 'Modern', life: 20 },
  { value: 'pauper', label: 'Pauper', life: 20 },
  { value: 'custom', label: 'Custom', life: 20 },
]

export default function Home() {
  const navigate = useNavigate()
  const [format, setFormat] = useState<GameFormat>('commander')
  const [roomCode, setRoomCode] = useState('')

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const handleCreateRoom = () => {
    const code = generateCode()
    navigate(`/game/${code}?format=${format}&create=true`)
  }

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      navigate(`/game/${roomCode.trim().toUpperCase()}`)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-purple-400 mb-2">⚔️ MTG Life Counter</h1>
      <p className="text-gray-400 mb-8">Contador de vidas con sincronización en tiempo real</p>

      <div className="w-full max-w-md space-y-6">
        {/* Create Room */}
        <div className="bg-[var(--color-bg-card)] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Crear Sala</h2>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Formato</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as GameFormat)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
            >
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label} ({f.life} vida)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCreateRoom}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Crear Sala
          </button>
        </div>

        {/* Join Room */}
        <div className="bg-[var(--color-bg-card)] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Unirse a Sala</h2>
          
          <input
            type="text"
            placeholder="Código de sala"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 uppercase"
            maxLength={6}
          />

          <button
            onClick={handleJoinRoom}
            disabled={!roomCode.trim()}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Unirse
          </button>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/history')}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
          >
            📊 Historial
          </button>
          <button
            onClick={() => navigate('/login')}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
          >
            👤 Login
          </button>
        </div>
      </div>
    </div>
  )
}
