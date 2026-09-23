import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

const content = readFileSync('.dev.vars', 'utf-8')
const env = {}
for (const line of content.split('\n')) {
  const match = line.match(/^([A-Z_]+)\s*=\s*"?([^"]*)"?$/)
  if (match) env[match[1]] = match[2].trim()
}
const sql = neon(env.DATABASE_URL)

async function run() {
  const res = await sql`SELECT email FROM admin_users LIMIT 1`
  console.log('Seed email:', res[0]?.email)
}
run().catch(console.error)
