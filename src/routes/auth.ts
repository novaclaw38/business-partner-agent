import { Router } from 'express'
import {
  verifyPassword,
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE_MS,
} from '../auth/password.js'

export const authRouter = Router()

authRouter.post('/login', (req, res) => {
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!verifyPassword(password)) {
    res.status(401).json({ error: 'Wrong password' })
    return
  }

  res.cookie(SESSION_COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
  })
  res.json({ ok: true })
})

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME)
  res.json({ ok: true })
})
