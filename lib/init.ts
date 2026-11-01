import { ensureDb as ensureDatabase } from './db';

// Keep the legacy init helper aligned with the shared initialization promise.
export async function ensureDb(): Promise<void> {
  await ensureDatabase();
}
