import { useState } from 'react'
import { LoginGate } from './components/LoginGate'
import { ChatView } from './components/ChatView'

export default function App() {
  const [authenticated, setAuthenticated] = useState(false)

  if (!authenticated) {
    return <LoginGate onSuccess={() => setAuthenticated(true)} />
  }

  return <ChatView onLoggedOut={() => setAuthenticated(false)} />
}
