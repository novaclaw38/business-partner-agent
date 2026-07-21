import bcrypt from 'bcryptjs'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { config } from '../config.js'

const SESSION_COOKIE = 'viper_session'
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export function verifyPassword(password: string): boolean {
  if (!config.authPasswordHash) return false
  return bcrypt.compareSync(password, config.authPasswordHash)
}

function sign(value: string): string {
  return createHmac('sha256', config.sessionSecret).update(value).digest('hex')
}

/** A signed session token: "<expiryMs>.<hmac>". No user identity needed — single-user app. */
export function createSessionToken(): string {
  const expiry = String(Date.now() + THIRTY_DAYS_MS)
  return `${expiry}.${sign(expiry)}`
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false
  const [expiry, signature] = token.split('.')
  if (!expiry || !signature) return false
  if (Number(expiry) < Date.now()) return false

  const expected = sign(expiry)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
export const SESSION_COOKIE_MAX_AGE_MS = THIRTY_DAYS_MS
