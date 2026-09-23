import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

const TEST_PASS = 'ProdTest123!'
const EMAIL = 'samueljohnibrotech@gmail.com'
const API_URL = 'https://silachomka-api.samueljohnibrotech.workers.dev'

// 1. Get DB connection
const content = readFileSync('.dev.vars', 'utf-8')
const env = {}
for (const line of content.split('\n')) {
  const match = line.match(/^([A-Z_]+)\s*=\s*"?([^"]*)"?$/)
  if (match) env[match[1]] = match[2].trim()
}
const sql = neon(env.DATABASE_URL)

async function hashPassword(password) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']
  )
  const salt = enc.encode('silachomka-secure-salt')
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  )
  const exported = await crypto.subtle.exportKey('raw', key)
  return Array.from(new Uint8Array(exported)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function runTest() {
  console.log('--- STARTING PRODUCTION AUTHENTICATION TEST ---')
  
  const [originalUser] = await sql`SELECT password_hash FROM admin_users WHERE email = ${EMAIL}`
  if (!originalUser) {
    throw new Error('Superadmin not found in database.')
  }
  const originalHash = originalUser.password_hash
  console.log('Saved original Superadmin state.')

  try {
    const testHashHex = await hashPassword(TEST_PASS)
    await sql`UPDATE admin_users SET password_hash = ${testHashHex} WHERE email = ${EMAIL}`
    console.log('Temporarily set test password hash.')

    // 1. LOGIN
    const loginRes = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: TEST_PASS })
    })
    if (!loginRes.ok) {
      throw new Error('Login failed: ' + await loginRes.text())
    }
    
    // Extract cookie
    const setCookieHeader = loginRes.headers.get('set-cookie')
    if (!setCookieHeader || !setCookieHeader.includes('silachomka_admin_session')) {
      throw new Error('Missing session cookie in response')
    }
    console.log('> Login successful, received session cookie.')
    
    const cookieString = setCookieHeader.split(';')[0]

    // 2. GET ME
    const meRes = await fetch(`${API_URL}/api/admin/me`, {
      headers: { 'Cookie': cookieString }
    })
    if (!meRes.ok) throw new Error('GET /me failed: ' + await meRes.text())
    const meData = await meRes.json()
    console.log('> Authenticated GET /api/admin/me passed. User:', meData.user.email)

    // 3. SAFE READ
    const beatsRes = await fetch(`${API_URL}/api/admin/beats`, {
      headers: { 'Cookie': cookieString }
    })
    if (!beatsRes.ok) throw new Error('Safe read failed: ' + await beatsRes.text())
    console.log('> Authenticated safe read passed.')

    // 4. LOGOUT
    const logoutRes = await fetch(`${API_URL}/api/admin/logout`, {
      method: 'POST',
      headers: { 'Cookie': cookieString }
    })
    if (!logoutRes.ok) throw new Error('Logout failed: ' + await logoutRes.text())
    
    const logoutCookie = logoutRes.headers.get('set-cookie')
    if (!logoutCookie || !logoutCookie.includes('Max-Age=0')) {
      throw new Error('Logout did not clear cookie')
    }
    console.log('> Logout successful.')

    // 5. POST-LOGOUT VERIFY (Simulate browser that deleted the cookie)
    const finalRes = await fetch(`${API_URL}/api/admin/me`)
    if (finalRes.status !== 401) {
      throw new Error('Unauthenticated request not rejected, status: ' + finalRes.status)
    }
    console.log('> Post-logout request correctly rejected with 401.')
    
    console.log('--- ALL PRODUCTION AUTH TESTS PASSED ---')
  } finally {
    // Restore
    await sql`UPDATE admin_users SET password_hash = ${originalHash} WHERE email = ${EMAIL}`
    console.log('Restored original Superadmin hash.')
  }
}

runTest().catch(console.error)
