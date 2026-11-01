'use client';

import { useEffect, useState } from 'react';

interface Server {
  id: number;
  name: string;
  code: string;
  status: string;
  description: string;
  key_count: number;
  created_at: number;
}

export default function ServersPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '' });

  const loadServers = () => {
    fetch('/api/admin/servers').then(r => r.json()).then(d => {
      if (d.ok) setServers(d.servers);
    }).catch(() => {});
  };

  useEffect(() => { loadServers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (d.ok) {
      setShowCreate(false);
      setForm({ name: '', code: '', description: '' });
      loadServers();
      (window as any).showToast?.('Server created', 'success');
    } else {
      (window as any).showToast?.(d.reason || 'Error', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this server? Keys will be orphaned.')) return;
    await fetch('/api/admin/servers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    loadServers();
  };

  const toggleStatus = async (server: Server) => {
    const newStatus = server.status === 'active' ? 'inactive' : 'active';
    await fetch('/api/admin/servers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: server.id, status: newStatus }),
    });
    loadServers();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Servers</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Server
        </button>
      </div>

      {showCreate && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Create Server</h3>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)} style={{ padding: '4px 8px' }}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Name</label>
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Code (unique)</label>
                <input className="input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required placeholder="e.g. eu-main" />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="label">Description</label>
                <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
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
                <th>Name</th>
                <th>Code</th>
                <th>Status</th>
                <th>Keys</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {servers.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td className="mono">{s.code}</td>
                  <td>
                    <span className={`badge badge-${s.status === 'active' ? 'active' : 'revoked'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td>{s.key_count}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => toggleStatus(s)}>
                        {s.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handleDelete(s.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {servers.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No servers yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
