import { getCookie } from 'hono/cookie'
import { verify } from 'hono/jwt'

export const COOKIE_NAME = 'silachomka_admin_session'

export const LEGACY_SALT = 'silachomka-secure-salt'
export const DEFAULT_ITERATIONS = 100000
export const MIN_ITERATIONS = 10000
export const MAX_ITERATIONS = 500000

export const MODULAR_HASH_REGEX = /^\$pbkdf2-sha256\$i=(\d+)\$([0-9a-f]{32})\$([0-9a-f]{64})$/
export const LEGACY_HASH_REGEX = /^[0-9a-f]{64}$/

// Polyfill WebCrypto for testing context if needed, but in Cloudflare it's global
const cryptoSubtle = globalThis.crypto?.subtle

/**
 * Constant-time comparison between two Uint8Arrays.
 * Enforces fixed-length comparison to prevent timing side channels.
 */
export function timingSafeEqualBytes(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) {
    return false
  }
  if (a.length !== b.length) {
    return false
  }
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}

/**
 * Helper: Convert Uint8Array to lowercase hexadecimal string.
 */
export function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Helper: Convert hexadecimal string to Uint8Array.
 */
export function hexToBytes(hex) {
  if (typeof hex !== 'string' || hex.length % 2 !== 0) {
    return new Uint8Array(0)
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

/**
 * Derive 256-bit (32 bytes) PBKDF2-HMAC-SHA256 key bytes.
 */
export async function derivePbkdf2Bytes(password, saltBytes, iterations) {
  const enc = new TextEncoder()
  const keyMaterial = await cryptoSubtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  )
  const bits = await cryptoSubtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  return new Uint8Array(bits)
}

/**
 * Modern password hashing: Generates modular $pbkdf2-sha256$i=...$<salt>$<hash> with unique 16-byte salt.
 */
export async function hashPassword(password, options = {}) {
  if (typeof password !== 'string' || !password) {
    throw new Error('Password must be a non-empty string')
  }
  const iterations = options.iterations || DEFAULT_ITERATIONS
  if (iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
    throw new Error(`Iterations must be between ${MIN_ITERATIONS} and ${MAX_ITERATIONS}`)
  }

  let saltBytes
  if (options.saltBytes instanceof Uint8Array) {
    saltBytes = options.saltBytes
  } else if (typeof options.saltHex === 'string') {
    saltBytes = hexToBytes(options.saltHex)
  } else {
    saltBytes = new Uint8Array(16)
    globalThis.crypto.getRandomValues(saltBytes)
  }

  if (saltBytes.length !== 16) {
    throw new Error('Salt must be exactly 16 bytes')
  }

  const saltHex = bytesToHex(saltBytes)
  const derivedBytes = await derivePbkdf2Bytes(password, saltBytes, iterations)
  const derivedHex = bytesToHex(derivedBytes)

  return `$pbkdf2-sha256$i=${iterations}$${saltHex}$${derivedHex}`
}

/**
 * Helper to generate legacy 64-character hex hash (for compatibility verification).
 */
export async function hashPasswordLegacy(password) {
  const enc = new TextEncoder()
  const legacySaltBytes = enc.encode(LEGACY_SALT)
  const derivedBytes = await derivePbkdf2Bytes(password, legacySaltBytes, DEFAULT_ITERATIONS)
  return bytesToHex(derivedBytes)
}

/**
 * Verify password against stored hash (supporting both modern modular and legacy formats).
 * Returns { valid: boolean, needsRehash: boolean }.
 */
export async function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || !password || typeof storedHash !== 'string' || !storedHash) {
    return { valid: false, needsRehash: false }
  }

  // 1. Check Modern Modular Format
  const modernMatch = storedHash.match(MODULAR_HASH_REGEX)
  if (modernMatch) {
    const iterations = parseInt(modernMatch[1], 10)
    if (isNaN(iterations) || iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
      return { valid: false, needsRehash: false }
    }
    const saltHex = modernMatch[2]
    const expectedHex = modernMatch[3]
    const saltBytes = hexToBytes(saltHex)
    const expectedBytes = hexToBytes(expectedHex)
    const derivedBytes = await derivePbkdf2Bytes(password, saltBytes, iterations)
    const valid = timingSafeEqualBytes(derivedBytes, expectedBytes)
    const needsRehash = valid && (iterations < DEFAULT_ITERATIONS)
    return { valid, needsRehash }
  }

  // 2. Check Legacy 64-character Format
  const legacyMatch = storedHash.match(LEGACY_HASH_REGEX)
  if (legacyMatch) {
    const enc = new TextEncoder()
    const legacySaltBytes = enc.encode(LEGACY_SALT)
    const expectedBytes = hexToBytes(storedHash)
    const derivedBytes = await derivePbkdf2Bytes(password, legacySaltBytes, DEFAULT_ITERATIONS)
    const valid = timingSafeEqualBytes(derivedBytes, expectedBytes)
    return { valid, needsRehash: valid }
  }

  // 3. Malformed / Unrecognized Format -> Fail closed
  return { valid: false, needsRehash: false }
}

export const adminAuth = async (c, next) => {
  const token = getCookie(c, COOKIE_NAME)
  if (!token) {
    return c.json({ error: 'Unauthorized', message: 'Missing admin session' }, 401)
  }
  if (!c.env?.JWT_SECRET || typeof c.env.JWT_SECRET !== 'string' || c.env.JWT_SECRET.trim() === '') {
    console.error('Server configuration error: JWT_SECRET is missing or invalid')
    return c.json({ error: 'Internal Server Error', message: 'Authentication misconfigured' }, 500)
  }
  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
    c.set('user', payload)
    await next()
  } catch (err) {
    console.error('JWT verify error:', err.message)
    return c.json({ error: 'Unauthorized', message: 'Invalid or expired session' }, 401)
  }
}

export const requireSuperadmin = async (c, next) => {
  const user = c.get('user')
  if (!user || user.role !== 'SUPERADMIN') {
    return c.json({ error: 'Forbidden', message: 'Superadmin privileges required' }, 403)
  }
  await next()
}
