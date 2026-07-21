import { useRef, useState } from 'react'
import { transcribeAudio } from '../lib/api'

const MAX_RECORD_MS = 15_000

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function MicButton({ onTranscript, disabled }: { onTranscript: (text: string) => void; disabled?: boolean }) {
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      setRecording(false)
      setBusy(true)
      try {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' })
        const base64 = await blobToBase64(blob)
        const transcript = await transcribeAudio(base64, 'WEBM_OPUS', 48000)
        if (transcript) onTranscript(transcript)
      } catch (err) {
        console.error('transcription failed', err)
      } finally {
        setBusy(false)
      }
    }

    recorder.start()
    recorderRef.current = recorder
    setRecording(true)
    stopTimerRef.current = setTimeout(() => stopRecording(), MAX_RECORD_MS)
  }

  function stopRecording() {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    recorderRef.current?.stop()
  }

  function handleClick() {
    if (busy || disabled) return
    if (recording) {
      stopRecording()
    } else {
      startRecording().catch((err) => console.error('mic access failed', err))
    }
  }

  return (
    <button
      type="button"
      className={`mic-btn ${recording ? 'recording' : ''}`}
      onClick={handleClick}
      disabled={disabled || busy}
      title={recording ? 'Stop recording' : 'Record voice message'}
    >
      {busy ? '…' : recording ? '■' : '●'}
    </button>
  )
}
