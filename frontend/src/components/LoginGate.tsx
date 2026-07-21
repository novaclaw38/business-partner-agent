import { useState } from 'react'
import { login } from '../lib/api'

export function LoginGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError('')
    const ok = await login(password)
    setPending(false)
    if (ok) {
      onSuccess()
    } else {
      setError('Access denied.')
    }
  }

  return (
    <div className="login-screen">
      <div className="wordmark-big mono">VIPER</div>
      <div className="tagline mono">business partner // authentication required</div>
      <form className="login-form" onSubmit={handleSubmit}>
        <input
          type="password"
          autoFocus
          placeholder="passphrase"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={pending || !password}>
          {pending ? 'verifying...' : 'enter'}
        </button>
        {error && <div className="login-error">{error}</div>}
      </form>
    </div>
  )
}
