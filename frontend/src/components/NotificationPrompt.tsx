import { useEffect, useState } from 'react'
import { subscribeToPush } from '../lib/push'

export function NotificationPrompt() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      setVisible(true)
    }
  }, [])

  async function handleEnable() {
    const ok = await subscribeToPush()
    if (ok) setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="notif-banner">
      <span>Enable check-in notifications?</span>
      <button onClick={handleEnable}>Enable</button>
    </div>
  )
}
