import { useState } from 'react'
import { LoginGate } from './components/LoginGate'
import { ChatView } from './components/ChatView'
import { MatrixRain } from './components/MatrixRain'

export default function App() {
  const [authenticated, setAuthenticated] = useState(false)

  return (
    <>
      <MatrixRain />
      {authenticated ? (
        <ChatView onLoggedOut={() => setAuthenticated(false)} />
      ) : (
        <LoginGate onSuccess={() => setAuthenticated(true)} />
      )}
    </>
  )
}
