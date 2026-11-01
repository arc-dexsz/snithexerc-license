export const dynamic = 'force-dynamic';

import { getDb, ensureDb, getSetting, setSetting } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/utils';

export async function GET() {
  await ensureDb();
  const session = await getSession();
  if (!session) return jsonError('Unauthorized', 401);

  const db = getDb();
  const result = await db.execute('SELECT * FROM settings');

  const settings: Record<string, string> = {};
  for (const row of result.rows) {
    // Never send password hashes or the JWT signing secret to the browser.
    if (row.key === 'admin_pass' || row.key === 'session_secret') continue;
    settings[row.key as string] = row.value as string;
  }

  return jsonOk({ ok: true, settings });
}

export async function POST(request: Request) {
  await ensureDb();
  const session = await getSession();
  if (!session) return jsonError('Unauthorized', 401);

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_REQUEST', 400);
  }

  for (const [key, value] of Object.entries(body)) {
    await setSetting(key, value);
  }

  return jsonOk({ ok: true, message: 'Settings updated' });
}
