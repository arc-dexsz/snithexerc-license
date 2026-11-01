export const dynamic = 'force-dynamic';

import { getDb, ensureDb } from '@/lib/db';
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

  const { key, new_device } = body;
  if (!key) {
    return jsonError('key is required', 400);
  }

  const db = getDb();
  const result = await db.execute({
    sql: 'UPDATE license_keys SET device_id = ? WHERE key_value = ?',
    args: [new_device || null, key],
  });

  if (result.rowsAffected === 0) {
    return jsonError('Key not found', 404);
  }

  return jsonOk({ ok: true, message: 'Device reset successfully' });
}
