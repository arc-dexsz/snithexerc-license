export const dynamic = 'force-dynamic';

import { getDb, ensureDb, getSetting } from '@/lib/db';
import { generateKey } from '@/lib/keys';
import { getSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/utils';

export async function GET(request: Request) {
  await ensureDb();
  const session = await getSession();
  if (!session) return jsonError('Unauthorized', 401);

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || '';
  const serverId = url.searchParams.get('server_id') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  const db = getDb();

  let where = '1=1';
  const args: any[] = [];

  if (search) {
    where += ' AND (k.key_value LIKE ? OR k.note LIKE ?)';
    args.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    where += ' AND k.status = ?';
    args.push(status);
  }
  if (serverId) {
    where += ' AND k.server_id = ?';
    args.push(serverId);
  }

  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM license_keys k WHERE ${where}`,
    args,
  });

  const result = await db.execute({
    sql: `SELECT k.*, s.name as server_name FROM license_keys k
          LEFT JOIN servers s ON k.server_id = s.id
          WHERE ${where}
          ORDER BY k.created_at DESC
          LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });

  return jsonOk({
    ok: true,
    keys: result.rows,
    total: countResult.rows[0].count,
    page,
    pages: Math.ceil((countResult.rows[0].count as number) / limit),
  });
}

export async function POST(request: Request) {
  await ensureDb();
  const session = await getSession();
  if (!session) return jsonError('Unauthorized', 401);

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_REQUEST', 400);
  }

  const {
    server_id,
    count = 1,
    expiry_days,
    max_uses,
    max_devices,
    game = '',
    note = '',
  } = body;

  if (!server_id) {
    return jsonError('server_id is required', 400);
  }

  const db = getDb();
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
      args: [keyValue, server_id, expiryTs, defaultMaxUses, defaultMaxDevices, game, note],
    });

    keys.push(keyValue);
  }

  return jsonOk({ ok: true, keys, count: keys.length });
}

export async function DELETE(request: Request) {
  await ensureDb();
  const session = await getSession();
  if (!session) return jsonError('Unauthorized', 401);

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_REQUEST', 400);
  }

  const { id } = body;
  if (!id) return jsonError('id is required', 400);

  const db = getDb();
  await db.execute({ sql: 'DELETE FROM license_keys WHERE id = ?', args: [id] });
  return jsonOk({ ok: true, message: 'Key deleted' });
}

export async function PATCH(request: Request) {
  await ensureDb();
  const session = await getSession();
  if (!session) return jsonError('Unauthorized', 401);

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_REQUEST', 400);
  }

  const { id, status, device_id } = body;
  if (!id) return jsonError('id is required', 400);

  const db = getDb();
  if (status) {
    await db.execute({ sql: 'UPDATE license_keys SET status = ? WHERE id = ?', args: [status, id] });
  }
  if (device_id !== undefined) {
    await db.execute({ sql: 'UPDATE license_keys SET device_id = ? WHERE id = ?', args: [device_id || null, id] });
  }
  return jsonOk({ ok: true, message: 'Key updated' });
}
