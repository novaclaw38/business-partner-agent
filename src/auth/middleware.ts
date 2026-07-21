import type { Request, Response, NextFunction } from 'express'
import { isValidSessionToken, SESSION_COOKIE_NAME } from './password.js'

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE_NAME]
  if (!isValidSessionToken(token)) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }
  next()
}
