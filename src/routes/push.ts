import { Router } from 'express'
import { config } from '../config.js'
import { addSubscription, removeSubscription } from '../push/webpush.js'

export const pushRouter = Router()

pushRouter.get('/push/public-key', (_req, res) => {
  res.json({ publicKey: config.vapidPublicKey })
})

pushRouter.post('/push/subscribe', (req, res) => {
  const sub = req.body
  if (!sub?.endpoint) {
    res.status(400).json({ error: 'invalid subscription' })
    return
  }
  addSubscription(sub)
  res.json({ ok: true })
})

pushRouter.post('/push/unsubscribe', (req, res) => {
  const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : ''
  if (endpoint) removeSubscription(endpoint)
  res.json({ ok: true })
})
