export const dynamic = 'force-dynamic';

import { getDb, ensureDb, getSetting } from '@/lib/db';
import { generateToken } from '@/lib/keys';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp, jsonError, jsonOk, formatDate } from '@/lib/utils';
import type { Row } from '@libsql/client';

interface KeyRow extends Row {
  id: number;
  key_value: string;
  server_id: number;
  server_name: string;
  server_code: string;
  server_status: string;
  device_id: string | null;
  status: string;
  expires_at: number;
  max_uses: number;
  uses: number;
  max_devices: number;
  game: string;
  devices_count?: number;
}

export async function GET(request: Request) {
  return handleConnect(request);
}

export async function POST(request: Request) {
  return handleConnect(request);
}

async function handleConnect(request: Request) {
  await ensureDb();
  const ip = getClientIp(request);

  // Rate limit check
  if (!await checkRateLimit(ip, 'connect', 10, 60_000)) {
    return jsonError('RATE_LIMITED', 429);
  }

  // Check maintenance mode
  const maintenance = await getSetting('maintenance');
  if (maintenance === '1') {
    const msg = await getSetting('maintenance_message');
    return jsonError(msg || 'MAINTENANCE', 503);
  }

  // Parse request params (JSON, form-urlencoded, or query string)
  let params: Record<string, string> = {};

  const contentType = request.headers.get('content-type') || '';

  if (request.method === 'GET') {
    const url = new URL(request.url);
    url.searchParams.forEach((v, k) => { params[k] = v; });
  } else if (contentType.includes('application/json')) {
    try {
      params = await request.json();
    } catch {
      return jsonError('INVALID_REQUEST', 400);
    }
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    const body = await request.text();
    const urlParams = new URLSearchParams(body);
    urlParams.forEach((v, k) => { params[k] = v; });
  } else {
    // Try query string as fallback
    const url = new URL(request.url);
    url.searchParams.forEach((v, k) => { params[k] = v; });
  }

  const key = params.key;
  const device = params.device;
  const game = params.game || '';
  const version = params.version || '';
  const action = params.action || '';

  if (!key) {
    return jsonError('INVALID_REQUEST', 400);
  }

  const db = getDb();

  // Look up key
  const keyResult = await db.execute({
    sql: 'SELECT k.*, s.name as server_name, s.code as server_code, s.status as server_status FROM license_keys k LEFT JOIN servers s ON k.server_id = s.id WHERE k.key_value = ?',
    args: [key],
  });

  if (keyResult.rows.length === 0) {
    await logConnection(db, null, null, ip, request.headers.get('user-agent') || '', device, game, 'failed', 'KEY_NOT_FOUND');
    return jsonError('KEY_NOT_FOUND', 404);
  }

  const keyRow = keyResult.rows[0] as KeyRow;

  // Check key status
  if (keyRow.status === 'revoked') {
    await logConnection(db, Number(keyRow.id), Number(keyRow.server_id), ip, request.headers.get('user-agent') || '', device, game, 'failed', 'KEY_REVOKED');
    return jsonError('KEY_REVOKED', 403);
  }

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if ((keyRow.expires_at || 0) > 0 && now > (keyRow.expires_at || 0)) {
    await logConnection(db, Number(keyRow.id), Number(keyRow.server_id), ip, request.headers.get('user-agent') || '', device, game, 'failed', 'KEY_EXPIRED');
    return jsonError('KEY_EXPIRED', 403);
  }

  // Check server status
  if (keyRow.server_status !== 'active') {
    await logConnection(db, Number(keyRow.id), Number(keyRow.server_id), ip, request.headers.get('user-agent') || '', device, game, 'failed', 'SERVER_OFFLINE');
    return jsonError('SERVER_OFFLINE', 503);
  }

  // Check game match
  if (game && keyRow.game && keyRow.game !== game) {
    await logConnection(db, Number(keyRow.id), Number(keyRow.server_id), ip, request.headers.get('user-agent') || '', device, game, 'failed', 'WRONG_GAME');
    return jsonError('WRONG_GAME', 403);
  }

  // Check usage limit
  if ((keyRow.max_uses || 0) > 0 && (keyRow.uses || 0) >= (keyRow.max_uses || 0)) {
    await logConnection(db, Number(keyRow.id), Number(keyRow.server_id), ip, request.headers.get('user-agent') || '', device, game, 'failed', 'USAGE_LIMIT');
    return jsonError('USAGE_LIMIT', 403);
  }

  // Handle device binding
  const isReset = action === 'reset';

  if (isReset && device) {
    // Reset device binding
    await db.execute({
      sql: 'UPDATE license_keys SET device_id = ? WHERE id = ?',
      args: [device, Number(keyRow.id)],
    });
    keyRow.device_id = device;
    keyRow.devices_count = 1;
  } else if (device && keyRow.device_id && keyRow.device_id !== device) {
    // Device mismatch
    const maxDevices = Number(keyRow.max_devices) || 1;
    if (maxDevices <= 1) {
      await logConnection(db, Number(keyRow.id), Number(keyRow.server_id), ip, request.headers.get('user-agent') || '', device, game, 'failed', 'DEVICE_LIMIT');
      return jsonError('DEVICE_LIMIT', 403);
    }
  } else if (device && !keyRow.device_id) {
    // First device — bind it
    await db.execute({
      sql: 'UPDATE license_keys SET device_id = ? WHERE id = ?',
      args: [device, Number(keyRow.id)],
    });
    keyRow.device_id = device;
  }

  // Increment uses
  await db.execute({
    sql: 'UPDATE license_keys SET uses = uses + 1 WHERE id = ?',
    args: [Number(keyRow.id)],
  });

  // Generate session token
  const token = generateToken();
  const expiryTs = (keyRow.expires_at || 0) > 0 ? keyRow.expires_at : now + 86400;
  const devicesCount = keyRow.device_id ? 1 : 0;

  // Log successful connection
  const response = {
    ok: true,
    status: true,
    reason: 'success',
    data: {
      token,
      rng: now,
      expired: formatDate(expiryTs),
      server: {
        name: keyRow.server_name || 'Unknown',
        code: keyRow.server_code || 'unknown',
      },
      key: {
        type: 'standard',
        device_limit: keyRow.max_devices || 1,
        devices_count: devicesCount,
      },
    },
  };

  const responseJson = JSON.stringify(response);
  await logConnection(
    db, Number(keyRow.id), Number(keyRow.server_id), ip,
    request.headers.get('user-agent') || '',
    device, game, 'success', 'success',
    responseJson.length,
  );

  // Fire webhook if configured
  const webhookUrl = await getSetting('webhook_url');
  if (webhookUrl) {
    try {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'connect',
          key: key,
          ip,
          device,
          game,
          timestamp: now,
        }),
      }).catch(() => {}); // fire and forget
    } catch {
      // webhook failure is non-blocking
    }
  }

  return jsonOk(response);
}

async function logConnection(
  db: any,
  keyId: number | undefined | null,
  serverId: number | undefined | null,
  ip: string,
  userAgent: string,
  device: string,
  game: string,
  status: string,
  message: string,
  responseSize: number = 0,
) {
  await db.execute({
    sql: `INSERT INTO connections (key_id, server_id, ip, user_agent, device_id, game, status, message, response_size)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [keyId ?? 0, serverId ?? 0, ip, userAgent, device, game, status, message, responseSize],
  });
}
