import { Router } from 'express'
import { runAgentTurn } from '../agent/claudeCode.js'

export const chatRouter = Router()

// Cost/abuse guard, not a security boundary: single-user app behind auth already.
const RATE_LIMIT_PER_MIN = 12
let windowStart = Date.now()
let windowCount = 0

function allowRequest(): boolean {
  const now = Date.now()
  if (now - windowStart > 60_000) {
    windowStart = now
    windowCount = 0
  }
  windowCount += 1
  return windowCount <= RATE_LIMIT_PER_MIN
}

let hasHadFirstTurn = false

chatRouter.post('/chat', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
  if (!message) {
    res.status(400).json({ error: 'message is required' })
    return
  }
  if (message.length > 8000) {
    res.status(400).json({ error: 'message is too long' })
    return
  }
  if (!allowRequest()) {
    res.status(429).json({ error: 'Too many messages — take a short break.' })
    return
  }

  try {
    const result = await runAgentTurn(message, { continueSession: hasHadFirstTurn })
    hasHadFirstTurn = true
    res.json({ reply: result.reply })
  } catch (err) {
    console.error('chat error:', err)
    res.status(502).json({ error: 'Viper had trouble responding — try again.' })
  }
})
