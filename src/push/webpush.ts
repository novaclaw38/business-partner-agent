import fs from 'node:fs'
import path from 'node:path'
import webpush from 'web-push'
import { config } from '../config.js'

const SUBSCRIPTIONS_PATH = path.join(config.repoRoot, 'push-subscriptions.json')

if (config.vapidPublicKey && config.vapidPrivateKey) {
  webpush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey)
}

function readSubscriptions(): webpush.PushSubscription[] {
  if (!fs.existsSync(SUBSCRIPTIONS_PATH)) return []
  try {
    return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_PATH, 'utf8'))
  } catch {
    return []
  }
}

function writeSubscriptions(subs: webpush.PushSubscription[]): void {
  fs.writeFileSync(SUBSCRIPTIONS_PATH, JSON.stringify(subs, null, 2))
}

export function addSubscription(sub: webpush.PushSubscription): void {
  const subs = readSubscriptions()
  if (!subs.some((s) => s.endpoint === sub.endpoint)) {
    subs.push(sub)
    writeSubscriptions(subs)
  }
}

export function removeSubscription(endpoint: string): void {
  writeSubscriptions(readSubscriptions().filter((s) => s.endpoint !== endpoint))
}

export async function sendPushToAll(title: string, body: string): Promise<void> {
  if (!config.vapidPublicKey || !config.vapidPrivateKey) {
    console.warn('sendPushToAll: VAPID keys not configured, skipping push')
    return
  }
  const subs = readSubscriptions()
  const payload = JSON.stringify({ title, body })

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload)
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          removeSubscription(sub.endpoint)
        } else {
          console.error('push send failed:', err)
        }
      }
    })
  )
}
