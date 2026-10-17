BUSINESS-PARTNER-AGENT ("Viper")
================================

An autonomous business-partner agent. Its "brain" is the Claude Code CLI invoked headlessly
(claude -p ...) with its working directory set to vault/, a live Obsidian vault. It does not
use a custom Anthropic API tool-use loop, so it runs on an existing Claude Code subscription
login.

HOW IT WORKS
------------
- The agent persona lives in vault/CLAUDE.md, which Claude Code loads automatically. The same
  content is re-seeded by ensureVaultSkeleton() in src/vault/bootstrap.ts; keep the two in sync.
- vault/ is real user data and is gitignored.
- Tool safety: invocations allow only Read, Write, Edit, Glob, Grep, WebSearch and WebFetch,
  with acceptEdits permission mode, scoped to the vault.
- There is no database; tasks, projects and conversation history are markdown in the vault.
- Express server with cookie authentication (bcrypt password hash), scheduled jobs
  (node-cron) and web push notifications. A separate frontend lives in frontend/.

PROJECT LAYOUT
--------------
  src/        Server (src/agent/claudeCode.ts runs the headless CLI; src/vault/ manages the vault)
  frontend/   Web front end (build separately)
  scripts/    chat-cli.ts and hash-password.ts
  deploy/     Deployment files
  docs/

COMMANDS
--------
  npm run dev            Express server with live reload
  npm run chat           CLI harness for the headless claude invocation
  npm run hash-password  Generate AUTH_PASSWORD_HASH for .env
  npm run build && npm start   Production build/run (backend; build frontend/ separately)

Requires Node 20 or newer and the Claude Code CLI. Copy .env.example to .env first.
