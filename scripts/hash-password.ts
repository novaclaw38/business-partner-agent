import readline from 'node:readline'
import bcrypt from 'bcryptjs'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

rl.question('Password to hash: ', (password) => {
  const hash = bcrypt.hashSync(password, 12)
  console.log('\nAUTH_PASSWORD_HASH=' + hash)
  console.log('\nPaste this into your .env file.')
  rl.close()
})
