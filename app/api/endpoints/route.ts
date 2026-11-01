export const dynamic = 'force-dynamic';

import { getDb, ensureDb } from '@/lib/db';
import { verifyBearerToken } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/utils';

export async function GET() {
  await ensureDb();
  const db = getDb();
  const result = await db.execute('SELECT * FROM custom_endpoints ORDER BY created_at DESC');
  return jsonOk({ ok: true, endpoints: result.rows });
}

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
    path,
    method = 'GET',
    status_code = 200,
    content_type = 'application/json',
    body: respBody = '{}',
    headers = '{}',
    enabled = true,
    auth_required = false,
    auth_token = '',
  } = body;

  if (!path) {
    return jsonError('path is required', 400);
  }

  const db = getDb();
  try {
    await db.execute({
      sql: `INSERT INTO custom_endpoints (path, method, status_code, content_type, body, headers, enabled, auth_required, auth_token)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [path, method, status_code, content_type, respBody, headers, enabled ? 1 : 0, auth_required ? 1 : 0, auth_token],
    });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return jsonError('Endpoint path already exists', 409);
    }
    throw e;
  }

  return jsonOk({ ok: true, message: 'Endpoint created' });
}

export async function DELETE(request: Request) {
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

  const { id } = body;
  if (!id) {
    return jsonError('id is required', 400);
  }

  const db = getDb();
  await db.execute({ sql: 'DELETE FROM custom_endpoints WHERE id = ?', args: [id] });
  return jsonOk({ ok: true, message: 'Endpoint deleted' });
}
