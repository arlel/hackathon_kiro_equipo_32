import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import Home from './pages/Home'
import Game from './pages/Game'
import Login from './pages/Login'
import Register from './pages/Register'
import History from './pages/History'
import LocalGame from './pages/LocalGame'
import Stats from './pages/Stats'
import Decks from './pages/Decks'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/game/:roomCode" element={<Game />} />
        <Route path="/history" element={<History />} />
        <Route path="/local-game" element={<LocalGame />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/decks" element={<Decks />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
