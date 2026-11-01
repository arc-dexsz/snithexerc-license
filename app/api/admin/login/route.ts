export const dynamic = 'force-dynamic';

import { ensureDb, getSetting, verifyPassword } from '@/lib/db';
import { createSession, setSessionCookie } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/utils';

export async function POST(request: Request) {
  await ensureDb();
  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_REQUEST', 400);
  }

  const { username, password } = body;
  if (!username || !password) {
    return jsonError('Username and password required', 400);
  }

  const adminUser = await getSetting('admin_user');
  const adminPassHash = await getSetting('admin_pass');

  if (username !== adminUser) {
    return jsonError('Invalid credentials', 401);
  }

  if (adminPassHash) {
    const valid = await verifyPassword(password, adminPassHash);
    if (!valid) {
      return jsonError('Invalid credentials', 401);
    }
  } else {
    // First time — password not set yet, check raw env
    if (password !== (process.env.ADMIN_PASS || 'admin123')) {
      return jsonError('Invalid credentials', 401);
    }
  }

  const token = await createSession(username, 'admin');
  await setSessionCookie(token);

  return jsonOk({ ok: true, message: 'Login successful' });
}
