import { config } from '../src/config.js'
import { ensureVaultSkeleton } from '../src/vault/bootstrap.js'

ensureVaultSkeleton()
console.log('vault seeded at', config.vaultPath)
