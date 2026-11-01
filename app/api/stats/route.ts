import { getDb, ensureDb } from '@/lib/db';
import { jsonOk } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureDb();
  const db = getDb();

  const [keysTotal, keysActive, keysRevoked, keysExpired, serversCount, connectionsTotal, connectionsToday, endpointsCount] = await Promise.all([
    db.execute('SELECT COUNT(*) as count FROM license_keys'),
    db.execute("SELECT COUNT(*) as count FROM license_keys WHERE status = 'active'"),
    db.execute("SELECT COUNT(*) as count FROM license_keys WHERE status = 'revoked'"),
    db.execute("SELECT COUNT(*) as count FROM license_keys WHERE status = 'expired'"),
    db.execute('SELECT COUNT(*) as count FROM servers'),
    db.execute('SELECT COUNT(*) as count FROM connections'),
    db.execute("SELECT COUNT(*) as count FROM connections WHERE created_at >= strftime('%s','now') - 86400"),
    db.execute('SELECT COUNT(*) as count FROM custom_endpoints'),
  ]);

  // Connections per day (last 7 days)
  const chartData = await db.execute(`
    SELECT date(created_at, 'unixepoch') as day, COUNT(*) as count
    FROM connections
    WHERE created_at >= strftime('%s','now') - 7 * 86400
    GROUP BY day
    ORDER BY day
  `);

  return jsonOk({
    ok: true,
    stats: {
      keys_total: keysTotal.rows[0].count,
      keys_active: keysActive.rows[0].count,
      keys_revoked: keysRevoked.rows[0].count,
      keys_expired: keysExpired.rows[0].count,
      servers_count: serversCount.rows[0].count,
      connections_total: connectionsTotal.rows[0].count,
      connections_today: connectionsToday.rows[0].count,
      endpoints_count: endpointsCount.rows[0].count,
      chart_data: chartData.rows,
    },
  });
}
