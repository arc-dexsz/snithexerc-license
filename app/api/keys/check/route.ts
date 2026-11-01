export const dynamic = 'force-dynamic';

import { getDb, ensureDb } from '@/lib/db';
import { verifyBearerToken } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/utils';

export async function GET(request: Request) {
  await ensureDb();
  if (!await verifyBearerToken(request)) {
    return jsonError('Unauthorized', 401);
  }

  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (!key) {
    return jsonError('key query param is required', 400);
  }

  const db = getDb();
  const result = await db.execute({
    sql: `SELECT k.*, s.name as server_name, s.code as server_code
          FROM license_keys k LEFT JOIN servers s ON k.server_id = s.id
          WHERE k.key_value = ?`,
    args: [key],
  });

  if (result.rows.length === 0) {
    return jsonError('Key not found', 404);
  }

  const row = result.rows[0];
  return jsonOk({
    ok: true,
    key: {
      value: row.key_value,
      status: row.status,
      server: row.server_name,
      server_code: row.server_code,
      device_id: row.device_id,
      expires_at: row.expires_at,
      max_uses: row.max_uses,
      uses: row.uses,
      max_devices: row.max_devices,
      game: row.game,
      note: row.note,
      created_at: row.created_at,
    },
  });
}
