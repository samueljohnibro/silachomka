import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const content = readFileSync(join(__dirname, '.dev.vars'), 'utf-8')
const env = {}
for (const line of content.split('\n')) {
  const match = line.match(/^([A-Z_]+)\s*=\s*"?([^"]*)"?$/)
  if (match) env[match[1]] = match[2].trim()
}

const sql = neon(env.DATABASE_URL)

async function check() {
  const users = await sql`SELECT id, email, password_hash FROM admin_users`
  console.log(users)
}
check().catch(console.error)
