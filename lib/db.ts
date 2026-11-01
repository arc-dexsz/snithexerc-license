import { createClient, type Client } from '@libsql/client';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

let _db: Client | null = null;
let _initPromise: Promise<void> | null = null;

export function getDb(): Client {
  if (_db) return _db;

  const databaseUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (databaseUrl) {
    if (process.env.NODE_ENV === 'production' && databaseUrl.startsWith('file:')) {
      throw new Error('A local SQLite file is not persistent on Vercel. Use a remote Turso database.');
    }
    if (process.env.NODE_ENV === 'production' && !authToken) {
      throw new Error('TURSO_AUTH_TOKEN is required when using Turso in production.');
    }

    _db = createClient({ url: databaseUrl, authToken });
    return _db;
  }

  // Vercel functions do not provide durable local storage. SQLite files are
  // supported for local development only; production must use a hosted DB.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('TURSO_DATABASE_URL is required in production. Configure Turso in Vercel.');
  }

  const dbPath = process.env.DATABASE_PATH || './data/app.db';
  _db = createClient({ url: `file:${dbPath}` });
  return _db;
}

/** Initialize the schema once per serverless instance, including concurrent requests. */
export async function ensureDb(): Promise<void> {
  if (!_initPromise) {
    _initPromise = initDb().catch((error) => {
      // Permit a later request to retry if the database was temporarily unavailable.
      _initPromise = null;
      throw error;
    });
  }

  await _initPromise;
}

export async function initDb(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASS) {
    throw new Error('ADMIN_PASS must be configured in Vercel before the first deployment.');
  }

  const db = getDb();

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'active',
      description TEXT DEFAULT '',
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS license_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_value TEXT UNIQUE NOT NULL,
      server_id INTEGER NOT NULL,
      device_id TEXT DEFAULT NULL,
      status TEXT DEFAULT 'active',
      expires_at INTEGER DEFAULT 0,
      max_uses INTEGER DEFAULT 0,
      uses INTEGER DEFAULT 0,
      max_devices INTEGER DEFAULT 1,
      game TEXT DEFAULT '',
      note TEXT DEFAULT '',
      created_at INTEGER DEFAULT (strftime('%s','now')),
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_id INTEGER,
      server_id INTEGER,
      ip TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      device_id TEXT DEFAULT '',
      game TEXT DEFAULT '',
      status TEXT DEFAULT '',
      message TEXT DEFAULT '',
      response_size INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS custom_endpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      method TEXT DEFAULT 'GET',
      status_code INTEGER DEFAULT 200,
      content_type TEXT DEFAULT 'application/json',
      body TEXT DEFAULT '{}',
      headers TEXT DEFAULT '{}',
      enabled INTEGER DEFAULT 1,
      auth_required INTEGER DEFAULT 0,
      auth_token TEXT DEFAULT '',
      hit_count INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
      ip TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      count INTEGER DEFAULT 1,
      window_start INTEGER DEFAULT 0,
      PRIMARY KEY (ip, endpoint)
    );
  `);

  const initialAdminPassword = process.env.ADMIN_PASS || 'admin123';
  const defaults: Record<string, string> = {
    admin_user: process.env.ADMIN_USER || 'admin',
    admin_pass: await hashPassword(initialAdminPassword),
    api_token: process.env.API_TOKEN || generateRandomToken(),
    session_secret: process.env.SESSION_SECRET || generateRandomToken(),
    key_prefix: 'PAN',
    key_pattern: 'X8-X4-X4',
    default_expiry_days: '30',
    default_max_uses: '0',
    default_max_devices: '1',
    maintenance: '0',
    maintenance_message: 'Under maintenance',
    webhook_url: '',
    timezone: 'UTC',
    session_timeout: '3600',
  };

  for (const [key, value] of Object.entries(defaults)) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
      args: [key, value],
    });
  }

  await db.execute({
    sql: 'INSERT OR IGNORE INTO servers (name, code, description) VALUES (?, ?, ?)',
    args: ['Default Server', 'default', 'Default server for license keys'],
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const [salt, keyHex] = hash.split(':');
    if (!salt || !keyHex) return false;
    const expected = Buffer.from(keyHex, 'hex');
    const actual = await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(derivedKey as Buffer);
      });
    });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function generateRandomToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function getSetting(key: string): Promise<string> {
  await ensureDb();
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT value FROM settings WHERE key = ?',
    args: [key],
  });
  return (result.rows[0]?.value as string) || '';
}

export async function setSetting(key: string, value: string): Promise<void> {
  await ensureDb();
  const db = getDb();
  await db.execute({
    sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    args: [key, value],
  });
}
