import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { config } from '../config.js'

const execFileAsync = promisify(execFile)

// No Bash/Task — this runs unattended, so the tool surface is deliberately
// limited to reading/writing vault notes and researching the web.
const ALLOWED_TOOLS = 'Read,Write,Edit,Glob,Grep,WebSearch,WebFetch'

interface ClaudeCliResult {
  result?: string
  session_id?: string
  is_error?: boolean
  error?: string
}

export interface AgentTurnResult {
  reply: string
  sessionId?: string
}

/**
 * Runs one turn of the agent by invoking the Claude Code CLI headlessly
 * (`claude -p`) with its working directory set to the vault. Claude Code
 * auto-loads vault/CLAUDE.md as the system prompt and uses its own
 * Read/Write/Edit/Glob/Grep tools scoped to that directory — no custom
 * tool-use loop needed. Auth rides on the user's existing Claude Code
 * login (subscription), not a separate metered Anthropic API key.
 */
export async function runAgentTurn(prompt: string, options: { continueSession?: boolean } = {}): Promise<AgentTurnResult> {
  const args = [
    '-p',
    prompt,
    '--output-format',
    'json',
    '--permission-mode',
    'acceptEdits',
    '--allowedTools',
    ALLOWED_TOOLS,
  ]
  if (options.continueSession !== false) {
    args.push('--continue')
  }

  try {
    const { stdout } = await execFileAsync('claude', args, {
      cwd: config.vaultPath,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 5 * 60 * 1000,
    })
    return parseCliOutput(stdout)
  } catch (err: unknown) {
    // --continue fails if there's no prior conversation yet in this cwd
    // (e.g. very first run) — retry once without it before giving up.
    if (options.continueSession !== false) {
      return runAgentTurn(prompt, { continueSession: false })
    }
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`claude CLI invocation failed: ${message}`)
  }
}

function parseCliOutput(stdout: string): AgentTurnResult {
  const trimmed = stdout.trim()
  let parsed: ClaudeCliResult
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    // Fall back to treating the raw output as the reply if JSON parsing fails.
    return { reply: trimmed || '(empty response)' }
  }
  if (parsed.is_error) {
    throw new Error(parsed.error || 'claude CLI reported an error')
  }
  return { reply: parsed.result || '(no text response)', sessionId: parsed.session_id }
}
