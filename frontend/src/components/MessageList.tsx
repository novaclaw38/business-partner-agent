export interface ChatMessage {
  role: 'user' | 'agent'
  text: string
}

export function MessageList({ messages, pending }: { messages: ChatMessage[]; pending: boolean }) {
  return (
    <>
      {messages.map((m, i) => (
        <div className={`msg-row ${m.role}`} key={i}>
          <div className={`msg-bubble ${m.role}`}>
            <div className="msg-label">{m.role === 'agent' ? 'viper' : 'you'}</div>
            {m.text}
          </div>
        </div>
      ))}
      {pending && (
        <div className="msg-row agent">
          <div className="msg-bubble agent">
            <div className="msg-label">viper</div>
            <span className="thinking">
              <span />
              <span />
              <span />
            </span>
          </div>
        </div>
      )}
    </>
  )
}
