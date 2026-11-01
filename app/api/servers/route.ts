export const dynamic = 'force-dynamic';

import { getDb, ensureDb } from '@/lib/db';
import { verifyBearerToken } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/utils';

export async function GET() {
  await ensureDb();
  const db = getDb();
  const result = await db.execute('SELECT * FROM servers ORDER BY created_at DESC');
  return jsonOk({ ok: true, servers: result.rows });
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

  const { name, code, description = '', status = 'active' } = body;
  if (!name || !code) {
    return jsonError('name and code are required', 400);
  }

  const db = getDb();
  try {
    await db.execute({
      sql: 'INSERT INTO servers (name, code, description, status) VALUES (?, ?, ?, ?)',
      args: [name, code, description, status],
    });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return jsonError('Server code already exists', 409);
    }
    throw e;
  }

  return jsonOk({ ok: true, message: 'Server created' });
}
