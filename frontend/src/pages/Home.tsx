import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n/I18nContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import type { GameFormat } from '@/types/game'

const FORMATS: { value: GameFormat; life: number }[] = [
  { value: 'commander', life: 40 },
  { value: '20vida', life: 20 },
  { value: 'custom', life: 20 },
]

const ROOM_CODE_REGEX = /^[A-Z0-9]{6}$/

function isValidRoomCode(code: string): boolean {
  return ROOM_CODE_REGEX.test(code)
}

export default function Home() {
  const navigate = useNavigate()
  const { isAuthenticated, logout } = useAuth()
  const { t } = useTranslation()

  // Room configuration state
  const [format, setFormat] = useState<GameFormat>('commander')
  const [poisonEnabled, setPoisonEnabled] = useState(false)
  const [turnCounterEnabled, setTurnCounterEnabled] = useState(false)
  const [customLife, setCustomLife] = useState(20)

  // Join room state
  const [roomCode, setRoomCode] = useState('')

  const startingLife = format === 'commander' ? 40 : format === '20vida' ? 20 : customLife

  const generateCode = () => {
    // Excluded: O/0 (ambiguous), I/1/L (ambiguous)
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
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
      <h1 className="text-4xl font-bold text-purple-400 mb-2">⚔️ MTG Kiro Life Counter</h1>
      <p className="text-gray-400 mb-4">{t('home.subtitle')}</p>
      <div className="mb-8">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Create Room */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-100">{t('home.createRoom')}</h2>

          {/* Format Selector */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('home.format')}</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as GameFormat)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {t('home.formatOption', { label: t(`format.${f.value}`), life: f.life })}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Starting Life - shown only when Custom format selected */}
          {format === 'custom' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('home.customLife')}</label>
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
            <span className="text-sm text-gray-300">{t('home.poisonCounters')}</span>
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
            <span className="text-sm text-gray-300">{t('home.turnCounter')}</span>
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
            {t('home.createRoom')}
          </button>

          <button
            onClick={handleCreateLocalRoom}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {t('home.createLocalRoom')}
          </button>
          {!isAuthenticated && (
            <p className="text-xs text-gray-500 text-center">
              {t('home.localRequiresLogin')}
            </p>
          )}
        </div>

        {/* Join Room */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-100">{t('home.joinRoom')}</h2>

          <div>
            <input
              type="text"
              placeholder={t('home.roomCodePlaceholder')}
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
                {t('home.roomCodeError')}
              </p>
            )}
          </div>

          <button
            onClick={handleJoinRoom}
            disabled={!roomCodeValid}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {t('home.join')}
          </button>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/history')}
            className="bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors text-sm"
          >
            {t('home.history')}
          </button>
          <button
            onClick={() => navigate('/stats')}
            className="bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors text-sm"
          >
            {t('home.stats')}
          </button>
          <button
            onClick={() => navigate('/decks')}
            className="bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors text-sm"
          >
            {t('home.myDecks')}
          </button>
          {isAuthenticated ? (
            <button
              onClick={logout}
              className="bg-gray-800 hover:bg-gray-700 text-red-400 py-2 rounded-lg transition-colors text-sm"
            >
              {t('home.logout')}
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors text-sm"
            >
              {t('home.login')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
