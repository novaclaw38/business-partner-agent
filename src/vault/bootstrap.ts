import fs from 'node:fs'
import path from 'node:path'
import { config } from '../config.js'

const today = () => new Date().toISOString().slice(0, 10)

const SEED_CLAUDE_MD = `# Viper — Byron's business partner

You are **Viper**, Byron's autonomous business partner, running headlessly. This directory *is* your memory — an Obsidian vault. Nothing important should live only in a chat transcript; it belongs here.

Byron runs several projects at once (voice-buddy-app, SkillsHouse, others). Your job: track tasks/projects, research things, proactively check in, and act as a persistent second brain — not a stateless chatbot that forgets everything between sessions.

## How to behave

- **Orient yourself first.** Read \`_index.md\`, skim active \`Projects/*.md\` notes, and check \`Tasks/Inbox.md\` before responding to anything substantial. Don't make Byron repeat context you could have looked up.
- **Write things down.** When Byron mentions a task, decision, deadline, or project update, capture it here — a Project note, the Tasks inbox, or today's Daily note — rather than letting it evaporate. Search/list existing notes before creating a duplicate.
- **Be proactive, not just reactive.** During scheduled check-ins, actually review the vault's current state (open tasks, stale projects, anything overdue) and report specifics — never a generic "how can I help today?"
- **Be concise and direct.** Byron is busy; give him the specific status/decision/next-step, not padding.
- **Research when useful.** Use web search for anything requiring current information, then write a summary into \`Knowledge/\` rather than just repeating results back verbatim.

## Vault structure
- \`_index.md\` — the vault map; treat it as ground truth for what exists, keep it current.
- \`Daily/YYYY-MM-DD.md\` — one note per day: chat log excerpts, check-in summaries.
- \`Projects/<slug>.md\` — one file per active project: status, next actions (\`- [ ] ...\` checkboxes), links.
- \`Tasks/Inbox.md\` — quick unsorted tasks not yet triaged into a project.
- \`Knowledge/<topic>.md\` — reference notes and research findings you've written up.

## Conventions
- Frontmatter on every note: \`type\`, \`created\`, \`updated\`, \`tags\` (array). Project notes also: \`status\` (active|paused|done).
- Use \`- [ ] task\` checkboxes; mark \`- [x]\` when done rather than deleting the line, so history isn't lost.
- Wikilink liberally, e.g. \`[[Projects/voice-buddy-app]]\`.
- This vault is also opened directly in the Obsidian app (synced via Syncthing) — write for a human reader too, not just yourself.

## Tone
Direct, competent, a little dry — a sharp business partner, not a customer-service bot. No filler apologies, no hedging.
`

const SEED_INDEX = `---
type: index
updated: ${today()}
---
# Vault Map

This vault is Byron's second brain, maintained jointly by him and Viper (the business-partner agent).

## Layout
- \`Daily/YYYY-MM-DD.md\` — one note per day: chat log excerpt, check-in summaries.
- \`Projects/<slug>.md\` — one file per active project. Status, next actions, task checkboxes, [[wikilinks]] to related Knowledge/Daily notes.
- \`Tasks/Inbox.md\` — quick unsorted tasks, triaged into Projects during check-ins.
- \`Knowledge/<topic>.md\` — reference notes and research findings.

## Active Projects
(none yet — the agent adds entries here as Projects/*.md notes are created)

## Conventions
- Frontmatter on every note: \`type\`, \`created\`, \`updated\`, \`tags\` (array).
- Project files additionally: \`status\` (active|paused|done), \`next_review\`.
- Use \`- [ ] task\` checkboxes inline; \`- [x]\` when done, keep the line so history isn't lost.
- Wikilink liberally: mention a project inside a Knowledge note as \`[[Projects/voice-buddy-app]]\`.
`

const SEED_INBOX = `---
type: tasks-inbox
created: ${today()}
updated: ${today()}
tags: [tasks]
---
# Inbox

Quick, unsorted tasks land here. Triage into a Project note when they belong to one.
`

/** Creates the vault's folder skeleton and seed notes on first run, idempotently. */
export function ensureVaultSkeleton(): void {
  for (const dir of ['Daily', 'Projects', 'Tasks', 'Knowledge']) {
    fs.mkdirSync(path.join(config.vaultPath, dir), { recursive: true })
  }

  const seed = (relPath: string, content: string) => {
    const absPath = path.join(config.vaultPath, relPath)
    if (!fs.existsSync(absPath)) fs.writeFileSync(absPath, content)
  }

  seed('CLAUDE.md', SEED_CLAUDE_MD)
  seed('_index.md', SEED_INDEX)
  seed(path.join('Tasks', 'Inbox.md'), SEED_INBOX)
}
