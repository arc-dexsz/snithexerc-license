export const dynamic = 'force-dynamic';

import { getDb, ensureDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/utils';

export async function GET() {
  await ensureDb();
  const session = await getSession();
  if (!session) return jsonError('Unauthorized', 401);

  const db = getDb();
  const result = await db.execute(`
    SELECT s.*, COUNT(k.id) as key_count
    FROM servers s LEFT JOIN license_keys k ON s.id = k.server_id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `);
  return jsonOk({ ok: true, servers: result.rows });
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

  const { name, code, description = '', status = 'active' } = body;
  if (!name || !code) return jsonError('name and code are required', 400);

  const db = getDb();
  try {
    await db.execute({
      sql: 'INSERT INTO servers (name, code, description, status) VALUES (?, ?, ?, ?)',
      args: [name, code, description, status],
    });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return jsonError('Server code already exists', 409);
    throw e;
  }

  return jsonOk({ ok: true, message: 'Server created' });
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

  const { id, name, description, status } = body;
  if (!id) return jsonError('id is required', 400);

  const db = getDb();
  if (name !== undefined) {
    await db.execute({ sql: 'UPDATE servers SET name = ? WHERE id = ?', args: [name, id] });
  }
  if (description !== undefined) {
    await db.execute({ sql: 'UPDATE servers SET description = ? WHERE id = ?', args: [description, id] });
  }
  if (status !== undefined) {
    await db.execute({ sql: 'UPDATE servers SET status = ? WHERE id = ?', args: [status, id] });
  }

  return jsonOk({ ok: true, message: 'Server updated' });
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
  await db.execute({ sql: 'DELETE FROM servers WHERE id = ?', args: [id] });
  return jsonOk({ ok: true, message: 'Server deleted' });
}
