export const dynamic = 'force-dynamic';

import { getDb, ensureDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/utils';

export async function GET(request: Request) {
  await ensureDb();
  const session = await getSession();
  if (!session) return jsonError('Unauthorized', 401);

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || '';
  const search = url.searchParams.get('search') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  const db = getDb();

  let where = '1=1';
  const args: any[] = [];

  if (status) {
    where += ' AND c.status = ?';
    args.push(status);
  }
  if (search) {
    where += ' AND (c.ip LIKE ? OR c.device_id LIKE ? OR c.game LIKE ? OR c.message LIKE ?)';
    args.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM connections c WHERE ${where}`,
    args,
  });

  const result = await db.execute({
    sql: `SELECT c.*, k.key_value, s.name as server_name
          FROM connections c
          LEFT JOIN license_keys k ON c.key_id = k.id
          LEFT JOIN servers s ON c.server_id = s.id
          WHERE ${where}
          ORDER BY c.created_at DESC
          LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });

  return jsonOk({
    ok: true,
    connections: result.rows,
    total: countResult.rows[0].count,
    page,
    pages: Math.ceil((countResult.rows[0].count as number) / limit),
  });
}
