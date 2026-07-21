import readline from 'node:readline'
import { config } from '../src/config.js'
import { ensureVaultSkeleton } from '../src/vault/bootstrap.js'
import { runAgentTurn } from '../src/agent/claudeCode.js'

ensureVaultSkeleton()

console.log(`Viper CLI — vault: ${config.vaultPath}`)
console.log('Type a message and press enter. Ctrl+C to quit.\n')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'you> ' })
let turnsSoFar = 0

rl.prompt()
rl.on('line', async (line) => {
  const text = line.trim()
  if (!text) return rl.prompt()

  try {
    const result = await runAgentTurn(text, { continueSession: turnsSoFar > 0 })
    turnsSoFar += 1
    console.log(`\nviper> ${result.reply}\n`)
  } catch (err) {
    console.error('error:', err instanceof Error ? err.message : err)
  }
  rl.prompt()
})
