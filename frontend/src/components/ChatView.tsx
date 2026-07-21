import { useEffect, useRef, useState } from 'react'
import { sendChat, synthesizeSpeech, UnauthorizedError } from '../lib/api'
import { MessageList, type ChatMessage } from './MessageList'
import { MicButton } from './MicButton'
import { NotificationPrompt } from './NotificationPrompt'
import { VoiceHead, type VoiceHeadState } from './VoiceHead'

export function ChatView({ onLoggedOut }: { onLoggedOut: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'agent', text: "Viper online. What's the status?" },
  ])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  // Wire the <audio> element through a Web Audio analyser once, so
  // VoiceHead can react to real playback amplitude. Must connect through to
  // destination or the element goes silent (createMediaElementSource
  // reroutes output into the graph).
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const source = ctx.createMediaElementSource(audio)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 128
    source.connect(analyser)
    analyser.connect(ctx.destination)
    audioCtxRef.current = ctx
    analyserRef.current = analyser

    audio.addEventListener('play', () => setSpeaking(true))
    audio.addEventListener('ended', () => setSpeaking(false))
    audio.addEventListener('pause', () => setSpeaking(false))

    return () => void ctx.close()
  }, [])

  // Browsers only allow audio.play() without restriction when it's tied to
  // real user activation. Playing a silent clip synchronously inside the mic
  // button's click handler "unlocks" this same <audio> element so that the
  // later real playback — after the STT + chat round-trips — isn't silently
  // blocked by autoplay policy.
  function unlockAudio() {
    const audio = audioRef.current
    if (!audio) return
    void audioCtxRef.current?.resume()
    audio.muted = true
    audio.play().catch(() => {}).finally(() => {
      audio.pause()
      audio.muted = false
    })
  }

  async function speak(text: string) {
    const audio = audioRef.current
    if (!audio) return
    try {
      const blob = await synthesizeSpeech(text)
      const url = URL.createObjectURL(blob)
      audio.src = url
      await audio.play()
    } catch (err) {
      console.error('speech playback failed', err)
    }
  }

  async function handleSend(overrideText?: string, speakReply = false) {
    const text = (overrideText ?? input).trim()
    if (!text || pending) return

    setMessages((prev) => [...prev, { role: 'user', text }])
    setInput('')
    setPending(true)

    try {
      const reply = await sendChat(text)
      setMessages((prev) => [...prev, { role: 'agent', text: reply }])
      if (speakReply) void speak(reply)
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

  const voiceHeadState: VoiceHeadState = speaking ? 'speaking' : pending ? 'thinking' : 'idle'

  return (
    <div className="app-shell">
      <div className="topbar">
        <VoiceHead state={voiceHeadState} analyser={analyserRef.current} />
        <div className="topbar-meta">
          <div className="wordmark">VIPER</div>
          <div className="topbar-right mono">{voiceHeadState}</div>
        </div>
      </div>

      <NotificationPrompt />

      <div className="chat-scroll">
        <MessageList messages={messages} pending={pending} />
      </div>

      <div className="composer">
        <textarea
          rows={1}
          placeholder="Message Viper..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <audio
          ref={audioRef}
          crossOrigin="anonymous"
          style={{ display: 'none' }}
          src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
        />
        <MicButton disabled={pending} onPress={unlockAudio} onTranscript={(text) => handleSend(text, true)} />
        <button className="send-btn" onClick={() => handleSend()} disabled={pending || !input.trim()}>
          ➤
        </button>
      </div>
    </div>
  )
}
