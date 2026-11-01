'use client';

import { useEffect, useState, useCallback } from 'react';

interface Connection {
  id: number;
  key_value: string;
  server_name: string;
  ip: string;
  user_agent: string;
  device_id: string;
  game: string;
  status: string;
  message: string;
  response_size: number;
  created_at: number;
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadConnections = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (filter) params.set('status', filter);
    if (search) params.set('search', search);
    fetch(`/api/admin/connections?${params}`).then(r => r.json()).then(d => {
      if (d.ok) {
        setConnections(d.connections);
        setTotal(d.total);
        setPages(d.pages);
      }
    }).catch(() => {});
  }, [page, filter, search]);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadConnections, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadConnections]);

  const exportCSV = () => {
    const headers = ['ID', 'Key', 'Server', 'IP', 'Device', 'Game', 'Status', 'Message', 'Date'];
    const rows = connections.map(c => [
      c.id, c.key_value || '', c.server_name || '', c.ip, c.device_id, c.game, c.status, c.message,
      new Date(c.created_at * 1000).toISOString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'connections.csv';
    a.click();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Connections</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            Auto-refresh (10s)
          </label>
          <button className="btn btn-ghost" onClick={exportCSV}>Export CSV</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input className="input" placeholder="Search IP, device, game..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
        <select className="select" style={{ width: 150 }} value={filter}
          onChange={e => { setFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>IP</th>
                <th>Key</th>
                <th>Device</th>
                <th>Game</th>
                <th>Status</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {connections.map(c => (
                <tr key={c.id}>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {new Date(c.created_at * 1000).toLocaleString()}
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>{c.ip}</td>
                  <td className="mono" style={{ fontSize: 11, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.key_value || '—'}
                  </td>
                  <td className="mono" style={{ fontSize: 11, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.device_id || '—'}
                  </td>
                  <td>{c.game || '—'}</td>
                  <td>
                    <span className={`badge badge-${c.status === 'success' ? 'active' : 'revoked'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.message}</td>
                </tr>
              ))}
              {connections.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No connections</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
            <span style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
              Page {page} of {pages} ({total} total)
            </span>
            <button className="btn btn-ghost" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
