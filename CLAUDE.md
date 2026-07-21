# business-partner-agent

Viper: Byron's autonomous business-partner agent. The "brain" is the Claude Code CLI itself, invoked headlessly (`claude -p ...`, see `src/agent/claudeCode.ts`) with its working directory set to `vault/` — NOT a custom Anthropic-API tool-use loop. This rides on Byron's existing Claude Code subscription login rather than a separate metered API key, which is a deliberate cost decision — don't reintroduce `@anthropic-ai/sdk` or a hand-rolled tool loop without checking with him first.

- The agent's *runtime persona/instructions* live in `vault/CLAUDE.md` — Claude Code auto-loads it because that's the cwd for every headless invocation. That file is also re-seeded by `ensureVaultSkeleton()` in `src/vault/bootstrap.ts` (same content, kept in sync manually — if you edit one, edit both) since `vault/` itself is gitignored.
- `vault/` is real user data (a live Obsidian vault, synced to the user's laptop via Syncthing) — it's gitignored. Never assume its contents from git history; read it live.
- Tool safety is handled by Claude Code itself: invocations pass `--allowedTools "Read,Write,Edit,Glob,Grep,WebSearch,WebFetch"` (no Bash/Task — this runs unattended) and `--permission-mode acceptEdits`, scoped to the vault cwd. Don't widen the allowed tool list without a concrete reason.
- No database by design (YAGNI) — task/project state and conversation history are markdown in the vault. Don't introduce SQLite/Postgres without a concrete reason that vault-as-markdown can't satisfy.
- Frontend must not look like default shadcn/Tailwind boilerplate — the user explicitly wants a deliberate futuristic visual direction, not generic component defaults.

## Commands
- `npm run dev` — run the Express server with live reload.
- `npm run chat` — CLI harness (`scripts/chat-cli.ts`) for testing the headless `claude` invocation without the web layer.
- `npm run hash-password` — generate `AUTH_PASSWORD_HASH` for `.env`.
- `npm run build` / `npm start` — production build/run (backend only; build the frontend separately with `npm run build` inside `frontend/`).
