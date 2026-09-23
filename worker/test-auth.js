import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import app from './src/index.js'
import { hashPassword } from './src/auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envContent = readFileSync(join(__dirname, '.dev.vars'), 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)\s*=\s*"?([^"]*)"?$/)
  if (match) env[match[1]] = match[2].trim()
}

const sql = neon(env.DATABASE_URL)
const EMAIL = 'samueljohnibrotech@gmail.com'
const TEST_PASS = 'TestPass123!'

async function runTest() {
  console.log('--- STARTING PRE-DEPLOYMENT AUTHENTICATION & CRUD TEST ---')
  
  // 1. Get original hash
  const admins = await sql`SELECT * FROM admin_users WHERE email = ${EMAIL}`
  if (!admins.length) throw new Error('Superadmin not found')
  const superadmin = admins[0]
  const originalHash = superadmin.password_hash
  console.log('Saved original Superadmin state.')

  // 2. Overwrite with test hash
  const testHashHex = await hashPassword(TEST_PASS)
  await sql`UPDATE admin_users SET password_hash = ${testHashHex} WHERE email = ${EMAIL}`
  console.log('Temporarily set test password hash.')

  try {
    // 3. Test Login
    const loginReq = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: TEST_PASS })
    })
    
    // We must pass the ENV explicitly since we're invoking Hono locally
    const loginRes = await app.fetch(loginReq, env)
    if (loginRes.status !== 200) throw new Error('Login failed: ' + await loginRes.text())
    
    const setCookie = loginRes.headers.get('set-cookie')
    if (!setCookie || !setCookie.includes('silachomka_admin_session')) throw new Error('No valid session cookie set')
    const cookieString = setCookie.split(';')[0]
    console.log('> Login successful, received session cookie.')

    // 4. Test Authenticated GET
    const meReq = new Request('http://localhost/api/admin/me', {
      headers: { 'Cookie': cookieString }
    })
    const meRes = await app.fetch(meReq, env)
    if (meRes.status !== 200) throw new Error('/api/admin/me failed')
    console.log('> Authenticated GET /api/admin/me passed.')

    // 5. Test CREATE (Beat)
    console.log('> Testing CREATE (Beat)...')
    const createReq = new Request('http://localhost/api/admin/beats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookieString },
      body: JSON.stringify({
        slug: 'test-auth-beat',
        title: 'Auth Test Beat',
        description: 'Initial description'
      })
    })
    const createRes = await app.fetch(createReq, env)
    const createdBeat = await createRes.json()
    if (createRes.status !== 201) throw new Error('CREATE failed: ' + JSON.stringify(createdBeat))
    const beatId = createdBeat.id
    console.log('   Created Beat ID:', beatId)

    // 6. Test UPDATE (Partial Update & NULL test)
    console.log('> Testing UPDATE (Nullability / COALESCE fix)...')
    const updateReq = new Request(`http://localhost/api/admin/beats/${beatId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookieString },
      body: JSON.stringify({
        title: 'Updated Auth Test Beat',
        description: null // We are explicitly setting this to NULL
      })
    })
    const updateRes = await app.fetch(updateReq, env)
    const updatedBeat = await updateRes.json()
    if (updateRes.status !== 200) throw new Error('UPDATE failed: ' + JSON.stringify(updatedBeat))
    if (updatedBeat.description !== null) throw new Error('description should be null, but is ' + updatedBeat.description)
    if (updatedBeat.slug !== 'test-auth-beat') throw new Error('slug should remain test-auth-beat, but is ' + updatedBeat.slug)
    console.log('   Update successful. Explicit NULL works.')

    // 7. Test DELETE
    console.log('> Testing DELETE...')
    const delReq = new Request(`http://localhost/api/admin/beats/${beatId}`, {
      method: 'DELETE',
      headers: { 'Cookie': cookieString }
    })
    const delRes = await app.fetch(delReq, env)
    if (delRes.status !== 200) throw new Error('DELETE failed')
    console.log('   Delete successful.')

    // 8. Wait a tiny bit for async audit logs to flush
    await new Promise(r => setTimeout(r, 1000))

    // 9. Verify Audit Logs
    const logs = await sql`
      SELECT action, entity_type, entity_id 
      FROM audit_logs 
      WHERE user_id = ${superadmin.id} 
      ORDER BY created_at DESC 
      LIMIT 3
    `
    console.log('> Audit logs found for this admin:')
    logs.reverse().forEach(l => {
      console.log(`   ${l.action} on ${l.entity_type} (${l.entity_id})`)
    })
    if (logs.length < 3) throw new Error('Missing audit logs')

    // 10. Test Logout
    console.log('> Testing POST /api/admin/logout')
    const logoutReq = new Request('http://localhost/api/admin/logout', {
      method: 'POST',
      headers: { 'Cookie': cookieString }
    })
    const logoutRes = await app.fetch(logoutReq, env)
    const logoutCookie = logoutRes.headers.get('set-cookie')
    if (!logoutCookie || !logoutCookie.includes('Max-Age=0')) throw new Error('Logout did not clear cookie')
    console.log('   Logout successful.')

    // 11. Verify unauthenticated after logout
    const finalReq = new Request('http://localhost/api/admin/me', {
      headers: { 'Cookie': logoutCookie.split(';')[0] }
    })
    const finalRes = await app.fetch(finalReq, env)
    if (finalRes.status !== 401) throw new Error('Logout failed to protect routes, status: ' + finalRes.status)
    console.log('   Post-logout request correctly rejected with 401.')

    console.log('--- ALL AUTH AND CRUD TESTS PASSED SUCCESSFULLY ---')

  } finally {
    // Restore original hash
    await sql`UPDATE admin_users SET password_hash = ${originalHash} WHERE email = ${EMAIL}`
    console.log('Restored original Superadmin hash.')
  }
}

runTest().catch(console.error)
