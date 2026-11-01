'use client';

import { useEffect, useState } from 'react';

interface Endpoint {
  id: number;
  path: string;
  method: string;
  status_code: number;
  content_type: string;
  body: string;
  headers: string;
  enabled: number;
  auth_required: number;
  hit_count: number;
  created_at: number;
}

export default function EndpointsPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    path: '', method: 'GET', status_code: '200', content_type: 'application/json',
    body: '{"ok":true}', headers: '{}', auth_required: false, auth_token: '',
  });

  const loadEndpoints = () => {
    fetch('/api/admin/endpoints').then(r => r.json()).then(d => {
      if (d.ok) setEndpoints(d.endpoints);
    }).catch(() => {});
  };

  useEffect(() => { loadEndpoints(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/endpoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        status_code: parseInt(form.status_code),
      }),
    });
    const d = await res.json();
    if (d.ok) {
      setShowCreate(false);
      loadEndpoints();
      (window as any).showToast?.('Endpoint created', 'success');
    } else {
      (window as any).showToast?.(d.reason || 'Error', 'error');
    }
  };

  const handleToggle = async (ep: Endpoint) => {
    await fetch('/api/admin/endpoints', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ep.id, enabled: ep.enabled ? 0 : 1 }),
    });
    loadEndpoints();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this endpoint?')) return;
    await fetch('/api/admin/endpoints', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    loadEndpoints();
  };

  const copyUrl = (path: string) => {
    const url = `${window.location.origin}/api/${path}`;
    (window as any).copyText?.(url, 'URL copied!');
  };

  const testEndpoint = async (ep: Endpoint) => {
    try {
      const res = await fetch(`/api/${ep.path}`, { method: ep.method });
      const data = await res.json();
      (window as any).showToast?.(`${ep.method} /api/${ep.path} → ${res.status}`, 'success');
      console.log('Response:', data);
    } catch (e) {
      (window as any).showToast?.('Test failed', 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Custom Endpoints</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Endpoint
        </button>
      </div>

      {showCreate && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Create Endpoint</h3>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)} style={{ padding: '4px 8px' }}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Path</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <span style={{ padding: '10px 12px', background: 'var(--bg)', border: '1px solid #3f3f46', borderRight: 'none', borderRadius: '8px 0 0 8px', color: 'var(--text-muted)', fontSize: 13 }}>/api/</span>
                  <input className="input" style={{ borderRadius: '0 8px 8px 0' }} value={form.path} onChange={e => setForm({ ...form, path: e.target.value })} required placeholder="my-endpoint" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label className="label">Method</label>
                  <select className="select" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                    <option>GET</option><option>POST</option><option>ANY</option>
                  </select>
                </div>
                <div>
                  <label className="label">Status Code</label>
                  <input className="input" type="number" value={form.status_code} onChange={e => setForm({ ...form, status_code: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Content-Type</label>
                <input className="input" value={form.content_type} onChange={e => setForm({ ...form, content_type: e.target.value })} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Response Body</label>
                <textarea className="textarea" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={4} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Headers (JSON)</label>
                <input className="input mono" value={form.headers} onChange={e => setForm({ ...form, headers: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={form.auth_required} onChange={e => setForm({ ...form, auth_required: e.target.checked })} />
                  Require Auth
                </label>
                {form.auth_required && (
                  <input className="input" style={{ flex: 1 }} placeholder="Auth token" value={form.auth_token} onChange={e => setForm({ ...form, auth_token: e.target.value })} />
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Path</th>
                <th>Method</th>
                <th>Status</th>
                <th>Hits</th>
                <th>Enabled</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map(ep => (
                <tr key={ep.id}>
                  <td>
                    <span className="mono">/api/{ep.path}</span>
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: ep.method === 'GET' ? 'rgba(34, 211, 238, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: ep.method === 'GET' ? 'var(--accent)' : 'var(--warning)',
                    }}>
                      {ep.method}
                    </span>
                  </td>
                  <td>{ep.status_code}</td>
                  <td>{ep.hit_count}</td>
                  <td>
                    <button
                      className={`badge badge-${ep.enabled ? 'active' : 'revoked'}`}
                      style={{ cursor: 'pointer', border: 'none' }}
                      onClick={() => handleToggle(ep)}
                    >
                      {ep.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => copyUrl(ep.path)}>
                        Copy URL
                      </button>
                      <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => testEndpoint(ep)}>
                        Test
                      </button>
                      <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => handleDelete(ep.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {endpoints.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No custom endpoints</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
