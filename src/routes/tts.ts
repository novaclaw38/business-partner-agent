import { Router } from 'express'
import { config } from '../config.js'

export const ttsRouter = Router()

ttsRouter.post('/tts', async (req, res) => {
  if (!config.googleTtsKey) {
    res.status(503).json({ error: 'GOOGLE_TTS_KEY not configured' })
    return
  }

  const text = typeof req.body?.text === 'string' ? req.body.text : ''
  if (!text) {
    res.status(400).json({ error: 'text is required' })
    return
  }
  if (text.length > 4000) {
    res.status(400).json({ error: 'text is too long' })
    return
  }

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${config.googleTtsKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'en-US', name: 'en-US-Neural2-D' },
        audioConfig: {
          audioEncoding: 'MP3',
          effectsProfileId: ['headphone-class-device'],
        },
      }),
    }
  )

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: { message?: string } }
    console.error('Google TTS error:', response.status, err.error?.message)
    res.status(502).json({ error: 'Google TTS error' })
    return
  }

  const { audioContent } = (await response.json()) as { audioContent: string }
  const audio = Buffer.from(audioContent, 'base64')
  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('Cache-Control', 'no-store')
  res.send(audio)
})
