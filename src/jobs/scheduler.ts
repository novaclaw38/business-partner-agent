import cron from 'node-cron'
import { config } from '../config.js'
import { runCheckin } from './checkin.js'

export function startScheduler(): void {
  if (!cron.validate(config.checkinCron)) {
    console.warn(`Invalid CHECKIN_CRON "${config.checkinCron}" — scheduled check-ins disabled.`)
    return
  }
  cron.schedule(config.checkinCron, () => {
    void runCheckin()
  })
  console.log(`Scheduled check-ins: ${config.checkinCron}`)
}
