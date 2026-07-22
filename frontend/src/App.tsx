import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Game from './pages/Game'
import Login from './pages/Login'
import Register from './pages/Register'
import History from './pages/History'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/game/:roomCode" element={<Game />} />
      <Route path="/history" element={<History />} />
    </Routes>
  )
}

export default App
