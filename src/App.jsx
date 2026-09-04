import { Routes, Route, Navigate } from 'react-router-dom'
import { ChatLayout } from './features/layout/ChatLayout.jsx'
import { useSyncTheme } from './hooks/useSyncTheme'

function App() {
  useSyncTheme()

  return (
    <Routes>
      <Route path="/" element={<ChatLayout />} />
      <Route path="/chat" element={<ChatLayout />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App