import path from 'node:path'
import fs from 'node:fs'
import express from 'express'
import cookieParser from 'cookie-parser'
import { config, assertServerConfig } from './config.js'
import { ensureVaultSkeleton } from './vault/bootstrap.js'
import { requireAuth } from './auth/middleware.js'
import { authRouter } from './routes/auth.js'
import { chatRouter } from './routes/chat.js'
import { ttsRouter } from './routes/tts.js'
import { sttRouter } from './routes/stt.js'
import { pushRouter } from './routes/push.js'
import { startScheduler } from './jobs/scheduler.js'

assertServerConfig()
ensureVaultSkeleton()

const app = express()
app.use(express.json({ limit: '5mb' }))
app.use(cookieParser())

app.use('/api', authRouter)
app.use('/api', requireAuth, chatRouter)
app.use('/api', requireAuth, ttsRouter)
app.use('/api', requireAuth, sttRouter)
app.use('/api', requireAuth, pushRouter)

const frontendDist = path.resolve(config.repoRoot, 'frontend', 'dist')
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
} else {
  app.get('/', (_req, res) => {
    res.send('business-partner-agent: frontend not built yet (run `npm run build` in frontend/).')
  })
}

startScheduler()

app.listen(config.port, () => {
  console.log(`Viper listening on :${config.port} (vault: ${config.vaultPath})`)
})
