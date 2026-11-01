'use client';

import { useEffect, useState } from 'react';

interface Key {
  id: number;
  key_value: string;
  server_id: number;
  server_name: string;
  device_id: string;
  status: string;
  expires_at: number;
  max_uses: number;
  uses: number;
  max_devices: number;
  game: string;
  note: string;
  created_at: number;
}

interface Server { id: number; name: string; code: string; }

export default function KeysPage() {
  const [keys, setKeys] = useState<Key[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [showGenerate, setShowGenerate] = useState(false);
  const [form, setForm] = useState({
    server_id: '', count: '10', expiry_days: '30', max_uses: '0', max_devices: '1', game: '', note: '',
  });
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);

  const loadKeys = () => {
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (search) params.set('search', search);
    if (filter) params.set('status', filter);
    fetch(`/api/admin/keys?${params}`).then(r => r.json()).then(d => {
      if (d.ok) {
        setKeys(d.keys);
        setTotal(d.total);
        setPages(d.pages);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    fetch('/api/admin/servers').then(r => r.json()).then(d => {
      if (d.ok) setServers(d.servers);
    }).catch(() => {});
  }, []);

  useEffect(() => { loadKeys(); }, [page, filter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadKeys();
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        server_id: parseInt(form.server_id),
        count: parseInt(form.count),
        expiry_days: parseInt(form.expiry_days),
        max_uses: parseInt(form.max_uses),
        max_devices: parseInt(form.max_devices),
        game: form.game,
        note: form.note,
      }),
    });
    const d = await res.json();
    if (d.ok) {
      setGeneratedKeys(d.keys);
      loadKeys();
      (window as any).showToast?.(`Generated ${d.count} keys`, 'success');
    } else {
      (window as any).showToast?.(d.reason || 'Error', 'error');
    }
  };

  const handleRevoke = async (keyValue: string) => {
    if (!confirm(`Revoke key ${keyValue}?`)) return;
    await fetch('/api/keys/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getApiToken()}`,
      },
      body: JSON.stringify({ key: keyValue }),
    });
    loadKeys();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this key?')) return;
    await fetch('/api/admin/keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    loadKeys();
  };

  const handleResetDevice = async (keyValue: string) => {
    const newDevice = prompt('Enter new device ID:');
    if (newDevice === null) return;
    await fetch('/api/keys/reset-device', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getApiToken()}`,
      },
      body: JSON.stringify({ key: keyValue, new_device: newDevice || undefined }),
    });
    loadKeys();
  };

  async function getApiToken() {
    const res = await fetch('/api/admin/settings');
    const d = await res.json();
    return d.settings?.api_token || '';
  }

  const exportCSV = () => {
    const headers = ['Key', 'Server', 'Status', 'Device', 'Game', 'Uses', 'Expires'];
    const rows = keys.map(k => [
      k.key_value, k.server_name, k.status, k.device_id || '', k.game, `${k.uses}/${k.max_uses || '∞'}`,
      k.expires_at > 0 ? new Date(k.expires_at * 1000).toISOString() : 'Never',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'keys.csv';
    a.click();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>License Keys</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={exportCSV}>Export CSV</button>
          <button className="btn btn-primary" onClick={() => { setShowGenerate(true); setGeneratedKeys([]); }}>
            + Generate Keys
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1 }}>
          <input
            className="input"
            placeholder="Search keys..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 300 }}
          />
          <button type="submit" className="btn btn-ghost">Search</button>
        </form>
        <select className="select" style={{ width: 150 }} value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="revoked">Revoked</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Generate Modal */}
      {showGenerate && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Generate Keys</h3>
              <button className="btn btn-ghost" onClick={() => setShowGenerate(false)} style={{ padding: '4px 8px' }}>✕</button>
            </div>
            <form onSubmit={handleGenerate}>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Server</label>
                <select className="select" value={form.server_id} onChange={e => setForm({ ...form, server_id: e.target.value })} required>
                  <option value="">Select server</option>
                  {servers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label className="label">Count</label>
                  <input className="input" type="number" min="1" max="100" value={form.count} onChange={e => setForm({ ...form, count: e.target.value })} />
                </div>
                <div>
                  <label className="label">Expiry (days)</label>
                  <input className="input" type="number" min="0" value={form.expiry_days} onChange={e => setForm({ ...form, expiry_days: e.target.value })} />
                </div>
                <div>
                  <label className="label">Max Uses (0=∞)</label>
                  <input className="input" type="number" min="0" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} />
                </div>
                <div>
                  <label className="label">Max Devices</label>
                  <input className="input" type="number" min="1" value={form.max_devices} onChange={e => setForm({ ...form, max_devices: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Game</label>
                <input className="input" value={form.game} onChange={e => setForm({ ...form, game: e.target.value })} placeholder="e.g. MLBB" />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="label">Note</label>
                <input className="input" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
              </div>

              {generatedKeys.length > 0 && (
                <div style={{ marginBottom: 20, padding: 12, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Generated Keys:</div>
                  {generatedKeys.map(k => (
                    <div key={k} className="mono" style={{ padding: '4px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{k}</span>
                      <button type="button" className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }}
                        onClick={() => (window as any).copyText?.(k)}>Copy</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowGenerate(false)}>Close</button>
                <button type="submit" className="btn btn-primary">Generate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Keys Table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Key</th>
                <th>Server</th>
                <th>Status</th>
                <th>Device</th>
                <th>Uses</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id}>
                  <td>
                    <span className="mono key-value" style={{ cursor: 'pointer' }}
                      onClick={() => (window as any).copyText?.(k.key_value)}>
                      {k.key_value}
                    </span>
                  </td>
                  <td>{k.server_name}</td>
                  <td>
                    <span className={`badge badge-${k.status}`}>
                      {k.status}
                    </span>
                  </td>
                  <td className="mono" style={{ fontSize: 11, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {k.device_id || '—'}
                  </td>
                  <td>{k.uses}/{k.max_uses || '∞'}</td>
                  <td style={{ fontSize: 12 }}>
                    {k.expires_at > 0 ? new Date(k.expires_at * 1000).toLocaleDateString() : 'Never'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {k.status === 'active' && (
                        <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => handleRevoke(k.key_value)}>
                          Revoke
                        </button>
                      )}
                      <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => handleResetDevice(k.key_value)}>
                        Reset
                      </button>
                      <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => handleDelete(k.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No keys found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
            <span style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 13 }}>Page {page} of {pages}</span>
            <button className="btn btn-ghost" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
