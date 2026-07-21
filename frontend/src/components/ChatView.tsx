import { useRef, useState } from 'react'
import { sendChat, UnauthorizedError } from '../lib/api'
import { MessageList, type ChatMessage } from './MessageList'
import { MicButton } from './MicButton'
import { NotificationPrompt } from './NotificationPrompt'

export function ChatView({ onLoggedOut }: { onLoggedOut: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'agent', text: "Viper online. What's the status?" },
  ])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleSend() {
    const text = input.trim()
    if (!text || pending) return

    setMessages((prev) => [...prev, { role: 'user', text }])
    setInput('')
    setPending(true)

    try {
      const reply = await sendChat(text)
      setMessages((prev) => [...prev, { role: 'agent', text: reply }])
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        onLoggedOut()
        return
      }
      setMessages((prev) => [...prev, { role: 'agent', text: 'Something went wrong reaching Viper. Try again.' }])
    } finally {
      setPending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="wordmark">
          <span className="status-dot" />
          VIPER
        </div>
        <div className="topbar-right mono">business partner</div>
      </div>

      <NotificationPrompt />

      <div className="chat-scroll">
        <MessageList messages={messages} pending={pending} />
      </div>

      <div className="composer">
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Message Viper..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <MicButton disabled={pending} onTranscript={(text) => setInput((prev) => (prev ? `${prev} ${text}` : text))} />
        <button className="send-btn" onClick={handleSend} disabled={pending || !input.trim()}>
          ➤
        </button>
      </div>
    </div>
  )
}
