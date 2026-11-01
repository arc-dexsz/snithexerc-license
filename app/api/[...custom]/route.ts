export const dynamic = 'force-dynamic';

import { getDb, ensureDb } from '@/lib/db';

export async function GET(request: Request) {
  return handleCustomEndpoint(request);
}

export async function POST(request: Request) {
  return handleCustomEndpoint(request);
}

async function handleCustomEndpoint(request: Request) {
  await ensureDb();
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');

  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM custom_endpoints WHERE path = ? AND enabled = 1',
    args: [path],
  });

  if (result.rows.length === 0) {
    return Response.json({ ok: false, reason: 'ENDPOINT_NOT_FOUND' }, { status: 404 });
  }

  const ep = result.rows[0];

  // Check auth if required
  if (ep.auth_required) {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || url.searchParams.get('token');
    if (token !== ep.auth_token) {
      return Response.json({ ok: false, reason: 'Unauthorized' }, { status: 401 });
    }
  }

  // Increment hit count
  await db.execute({
    sql: 'UPDATE custom_endpoints SET hit_count = hit_count + 1 WHERE id = ?',
    args: [ep.id],
  });

  // Build response headers
  const headers: Record<string, string> = {
    'Content-Type': String(ep.content_type) || 'application/json',
  };

  try {
    const customHeaders = JSON.parse(String(ep.headers || '{}'));
    Object.assign(headers, customHeaders);
  } catch {}

  return new Response(String(ep.body) || '{}', {
    status: Number(ep.status_code) || 200,
    headers,
  });
}
