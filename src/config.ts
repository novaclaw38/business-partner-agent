import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

export const config = {
  repoRoot,
  vaultPath: path.resolve(repoRoot, process.env.VAULT_PATH || 'vault'),
  port: Number(process.env.PORT || 3000),

  googleTtsKey: process.env.GOOGLE_TTS_KEY || '',
  googleSttKey: process.env.GOOGLE_STT_KEY || process.env.GOOGLE_TTS_KEY || '',

  authPasswordHash: process.env.AUTH_PASSWORD_HASH || '',
  sessionSecret: process.env.SESSION_SECRET || '',

  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:rebawntech@gmail.com',

  checkinCron: process.env.CHECKIN_CRON || '0 8,13,18 * * *',
}

export function assertServerConfig(): void {
  required('AUTH_PASSWORD_HASH')
  required('SESSION_SECRET')
}
