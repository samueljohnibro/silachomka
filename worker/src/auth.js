import { getCookie } from 'hono/cookie'
import { verify } from 'hono/jwt'

const JWT_SECRET = 'temporary-secret-key-change-in-production'
export const COOKIE_NAME = 'silachomka_admin_session'

// Polyfill WebCrypto for testing context if needed, but in Cloudflare it's global
const cryptoSubtle = globalThis.crypto?.subtle

export async function hashPassword(password) {
  const enc = new TextEncoder()
  const keyMaterial = await cryptoSubtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']
  )
  const salt = enc.encode('silachomka-secure-salt')
  const key = await cryptoSubtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  )
  const exported = await cryptoSubtle.exportKey('raw', key)
  return Array.from(new Uint8Array(exported)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export const adminAuth = async (c, next) => {
  const token = getCookie(c, COOKIE_NAME)
  if (!token) {
    return c.json({ error: 'Unauthorized', message: 'Missing admin session' }, 401)
  }
  try {
    const payload = await verify(token, c.env.JWT_SECRET || JWT_SECRET, 'HS256')
    c.set('user', payload)
    await next()
  } catch (err) {
    console.error('JWT verify error:', err.message)
    return c.json({ error: 'Unauthorized', message: 'Invalid or expired session' }, 401)
  }
}
