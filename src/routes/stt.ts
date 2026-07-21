import { Router } from 'express'
import { config } from '../config.js'

export const sttRouter = Router()

interface GoogleSttResponse {
  results?: Array<{ alternatives?: Array<{ transcript?: string }> }>
}

sttRouter.post('/stt', async (req, res) => {
  if (!config.googleSttKey) {
    res.status(503).json({ error: 'GOOGLE_STT_KEY not configured' })
    return
  }

  const audioBase64 = typeof req.body?.audio === 'string' ? req.body.audio : ''
  const encoding = typeof req.body?.encoding === 'string' ? req.body.encoding : 'WEBM_OPUS'
  const sampleRateHertz = Number(req.body?.sampleRateHertz) || 48000

  if (!audioBase64) {
    res.status(400).json({ error: 'audio is required (base64)' })
    return
  }
  // ~15s of webm/opus at typical bitrates comfortably fits under this cap.
  if (audioBase64.length > 4 * 1024 * 1024) {
    res.status(400).json({ error: 'audio clip too large' })
    return
  }

  const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${config.googleSttKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config: { encoding, sampleRateHertz, languageCode: 'en-US' },
      audio: { content: audioBase64 },
    }),
  })

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: { message?: string } }
    console.error('Google STT error:', response.status, err.error?.message)
    res.status(502).json({ error: 'Google STT error' })
    return
  }

  const data = (await response.json()) as GoogleSttResponse
  const transcript = data.results?.map((r) => r.alternatives?.[0]?.transcript ?? '').join(' ').trim() ?? ''
  res.json({ transcript })
})
