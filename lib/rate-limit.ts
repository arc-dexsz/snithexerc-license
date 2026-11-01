import { getDb } from './db';

/**
 * Persistent, atomic rate limiter. Keeping counters in the database avoids
 * resetting limits whenever Vercel starts a new serverless instance.
 */
export async function checkRateLimit(
  ip: string,
  endpoint: string,
  maxRequests: number = 10,
  windowMs: number = 60_000,
): Promise<boolean> {
  const db = getDb();
  const now = Date.now();

  const result = await db.execute({
    sql: `
      INSERT INTO rate_limits (ip, endpoint, count, window_start)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(ip, endpoint) DO UPDATE SET
        count = CASE
          WHEN rate_limits.window_start + ? <= ? THEN 1
          ELSE rate_limits.count + 1
        END,
        window_start = CASE
          WHEN rate_limits.window_start + ? <= ? THEN excluded.window_start
          ELSE rate_limits.window_start
        END
      RETURNING count
    `,
    args: [ip, endpoint, now, windowMs, now, windowMs, now],
  });

  return Number(result.rows[0]?.count ?? maxRequests + 1) <= maxRequests;
}
