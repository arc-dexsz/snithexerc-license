export const dynamic = 'force-dynamic';

import { clearSession } from '@/lib/auth';
import { jsonOk } from '@/lib/utils';

export async function POST() {
  await clearSession();
  return jsonOk({ ok: true, message: 'Logged out' });
}
