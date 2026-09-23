import { Client } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

// Polyfill WebCrypto for Node.js if necessary (Node >= 19 has global crypto)
import { webcrypto } from 'crypto';
const cryptoSubtle = globalThis.crypto?.subtle || webcrypto.subtle;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==========================================
// UTILITIES
// ==========================================
function loadDatabaseUrl() {
  const devVarsPath = join(__dirname, '..', '.dev.vars');
  const content = readFileSync(devVarsPath, 'utf-8');
  for (const line of content.split('\n')) {
    const match = line.match(/^DATABASE_URL\s*=\s*"?([^"]*)"?$/);
    if (match) return match[1].trim();
  }
  throw new Error('DATABASE_URL not found in worker/.dev.vars');
}

// Exactly matches worker/src/index.js
async function hashPassword(password) {
  const enc = new TextEncoder();
  const keyMaterial = await cryptoSubtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']
  );
  const salt = enc.encode('silachomka-secure-salt');
  const key = await cryptoSubtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  );
  const exported = await cryptoSubtle.exportKey('raw', key);
  return Array.from(new Uint8Array(exported)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Secure hidden password prompt
function questionHidden(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    process.stdout.write(query);
    
    // Hide typing
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (['\r', '\n', '\r\n'].includes(stringToWrite)) {
        rl.output.write(stringToWrite);
      } else {
        rl.output.write('*');
      }
    };
    
    rl.question('', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function question(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// ==========================================
// MAIN
// ==========================================
async function main() {
  console.log('--- SILACHOMKA SUPERADMIN SEED ---');
  
  const email = await question('Enter Superadmin Email: ');
  if (!email.includes('@')) {
    console.error('Invalid email format.');
    process.exit(1);
  }

  const password = await questionHidden('Enter Secure Password: ');
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const confirmPassword = await questionHidden('Confirm Password: ');
  if (password !== confirmPassword) {
    console.error('Passwords do not match.');
    process.exit(1);
  }

  console.log('\nHashing password securely... (this takes a moment)');
  const passwordHash = await hashPassword(password);
  
  const databaseUrl = loadDatabaseUrl();
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  
  await client.connect();
  
  try {
    const result = await client.query(`
      INSERT INTO admin_users (email, password_hash, role)
      VALUES ($1, $2, 'SUPERADMIN')
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email, role
    `, [email, passwordHash]);

    if (result.rowCount === 0) {
      console.log(`\nAccount for ${email} already exists. No duplicates created.`);
    } else {
      console.log(`\nSUCCESS: Superadmin account created for ${result.rows[0].email} (ID: ${result.rows[0].id})`);
    }
  } catch (err) {
    console.error('Database error:', err.message);
  } finally {
    await client.end();
  }
}

main();
