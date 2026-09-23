import { readFileSync } from 'fs'
import { spawn } from 'child_process'

const content = readFileSync('.dev.vars', 'utf-8')
const env = {}
for (const line of content.split('\n')) {
  const match = line.match(/^([A-Z_]+)\s*=\s*"?([^"]*)"?$/)
  if (match) env[match[1]] = match[2].trim()
}

async function setSecret(name, value) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['wrangler', 'secret', 'put', name], {
      stdio: ['pipe', 'inherit', 'inherit'],
      shell: true
    })
    child.stdin.write(value)
    child.stdin.end()
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`wrangler secret put ${name} exited with code ${code}`))
    })
  })
}

async function run() {
  if (env.DATABASE_URL) {
    const url = new URL(env.DATABASE_URL)
    console.log('Database host:', url.hostname)
    console.log('Setting DATABASE_URL...')
    await setSecret('DATABASE_URL', env.DATABASE_URL)
  }
  
  if (env.JWT_SECRET) {
    console.log('Setting JWT_SECRET...')
    await setSecret('JWT_SECRET', env.JWT_SECRET)
  }
  
  console.log('All secrets set.')
}

run().catch(console.error)
