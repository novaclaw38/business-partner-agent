import { runAgentTurn } from '../agent/claudeCode.js'
import { sendPushToAll } from '../push/webpush.js'

const CHECKIN_PROMPT =
  'Do a check-in: review open tasks in Tasks/Inbox.md, active Projects/*.md notes, and anything overdue or stale. ' +
  "Append a '## Check-in' section (with today's timestamp) to today's Daily note summarizing what you found. " +
  'Then reply here with a short, specific status update for Byron — flag anything that needs his attention today. Keep it tight, no filler.'

export async function runCheckin(): Promise<void> {
  try {
    const result = await runAgentTurn(CHECKIN_PROMPT, { continueSession: false })
    await sendPushToAll('Viper check-in', result.reply.slice(0, 500))
  } catch (err) {
    console.error('check-in failed:', err)
  }
}
