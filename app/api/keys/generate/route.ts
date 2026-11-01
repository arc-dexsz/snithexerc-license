export const dynamic = 'force-dynamic';

import { getDb, ensureDb, getSetting } from '@/lib/db';
import { generateKey } from '@/lib/keys';
import { verifyBearerToken } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/utils';

export async function POST(request: Request) {
  await ensureDb();
  if (!await verifyBearerToken(request)) {
    return jsonError('Unauthorized', 401);
  }

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_REQUEST', 400);
  }

  const {
    server_code,
    count = 1,
    expiry_days,
    max_uses,
    max_devices,
    game = '',
    note = '',
  } = body;

  if (!server_code) {
    return jsonError('server_code is required', 400);
  }

  const db = getDb();

  // Look up server
  const serverResult = await db.execute({
    sql: 'SELECT id FROM servers WHERE code = ?',
    args: [server_code],
  });

  if (serverResult.rows.length === 0) {
    return jsonError('Server not found', 404);
  }

  const serverId = serverResult.rows[0].id;
  const prefix = await getSetting('key_prefix');
  const pattern = await getSetting('key_pattern');
  const defaultExpiry = expiry_days || parseInt(await getSetting('default_expiry_days')) || 30;
  const defaultMaxUses = max_uses || parseInt(await getSetting('default_max_uses')) || 0;
  const defaultMaxDevices = max_devices || parseInt(await getSetting('default_max_devices')) || 1;

  const expiryTs = defaultExpiry > 0
    ? Math.floor(Date.now() / 1000) + defaultExpiry * 86400
    : 0;

  const numKeys = Math.min(Math.max(1, parseInt(count) || 1), 100);
  const keys: string[] = [];

  for (let i = 0; i < numKeys; i++) {
    let keyValue = generateKey(prefix, pattern);

    // Ensure uniqueness
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.execute({
        sql: 'SELECT 1 FROM license_keys WHERE key_value = ?',
        args: [keyValue],
      });
      if (existing.rows.length === 0) break;
      keyValue = generateKey(prefix, pattern);
      attempts++;
    }

    await db.execute({
      sql: `INSERT INTO license_keys (key_value, server_id, status, expires_at, max_uses, max_devices, game, note)
            VALUES (?, ?, 'active', ?, ?, ?, ?, ?)`,
      args: [keyValue, serverId, expiryTs, defaultMaxUses, defaultMaxDevices, game, note],
    });

    keys.push(keyValue);
  }

  return jsonOk({ ok: true, keys, count: keys.length });
}
