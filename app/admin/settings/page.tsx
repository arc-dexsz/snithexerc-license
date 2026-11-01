'use client';

import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState({ current: '', newPass: '', confirm: '' });

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      if (d.ok) setSettings(d.settings);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const saveSettings = async (updates: Record<string, string>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    (window as any).showToast?.('Settings saved', 'success');
  };

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) token += chars[Math.floor(Math.random() * chars.length)];
    saveSettings({ api_token: token });
  };

  const generateSessionSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = '';
    for (let i = 0; i < 64; i++) secret += chars[Math.floor(Math.random() * chars.length)];
    saveSettings({ session_secret: secret });
  };

  // Live key format preview
  const previewKey = () => {
    const prefix = settings.key_prefix || 'PAN';
    const pattern = settings.key_pattern || 'X8-X4-X4';
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const parts = pattern.split('-');
    let key = prefix;
    for (const part of parts) {
      const len = parseInt(part.replace(/[^0-9]/g, ''), 10) || 4;
      let random = '';
      for (let i = 0; i < len; i++) random += chars[Math.floor(Math.random() * chars.length)];
      key += '-' + random;
    }
    return key;
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Settings</h1>

      <div style={{ display: 'grid', gap: 24 }}>
        {/* Profile */}
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Admin Profile</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label">Username</label>
              <input className="input" value={settings.admin_user || ''} onChange={e => setSettings({ ...settings, admin_user: e.target.value })}
                onBlur={() => saveSettings({ admin_user: settings.admin_user })} />
            </div>
          </div>
        </div>

        {/* API Token */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>API Token</h2>
            <button className="btn btn-ghost" onClick={generateToken}>Regenerate</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input className="input mono" value={settings.api_token || ''} readOnly style={{ flex: 1 }} />
            <button className="btn btn-ghost" onClick={() => (window as any).copyText?.(settings.api_token)}>Copy</button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Used as Bearer token for privileged API endpoints</p>
        </div>

        {/* Key Defaults */}
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Key Format Defaults</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label className="label">Key Prefix</label>
              <input className="input" value={settings.key_prefix || ''} onChange={e => setSettings({ ...settings, key_prefix: e.target.value })}
                onBlur={() => saveSettings({ key_prefix: settings.key_prefix })} />
            </div>
            <div>
              <label className="label">Key Pattern</label>
              <input className="input" value={settings.key_pattern || ''} onChange={e => setSettings({ ...settings, key_pattern: e.target.value })}
                onBlur={() => saveSettings({ key_pattern: settings.key_pattern })} />
            </div>
            <div>
              <label className="label">Default Expiry (days)</label>
              <input className="input" type="number" value={settings.default_expiry_days || ''} onChange={e => setSettings({ ...settings, default_expiry_days: e.target.value })}
                onBlur={() => saveSettings({ default_expiry_days: settings.default_expiry_days })} />
            </div>
            <div>
              <label className="label">Default Max Devices</label>
              <input className="input" type="number" value={settings.default_max_devices || ''} onChange={e => setSettings({ ...settings, default_max_devices: e.target.value })}
                onBlur={() => saveSettings({ default_max_devices: settings.default_max_devices })} />
            </div>
          </div>
          <div style={{ padding: 12, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Preview:</div>
            <div className="mono" style={{ fontSize: 14, color: 'var(--accent)' }}>{previewKey()}</div>
          </div>
        </div>

        {/* Webhook */}
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Webhook</h2>
          <div>
            <label className="label">Webhook URL (POST on connect)</label>
            <input className="input" value={settings.webhook_url || ''} onChange={e => setSettings({ ...settings, webhook_url: e.target.value })}
              onBlur={() => saveSettings({ webhook_url: settings.webhook_url })} placeholder="https://your-webhook.com/hook" />
          </div>
        </div>

        {/* Maintenance */}
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Maintenance Mode</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.maintenance === '1'}
                onChange={e => saveSettings({ maintenance: e.target.checked ? '1' : '0' })} />
              <span>Enable maintenance mode</span>
            </label>
            {settings.maintenance === '1' && (
              <span className="badge badge-expired">Active</span>
            )}
          </div>
          <div>
            <label className="label">Maintenance Message</label>
            <input className="input" value={settings.maintenance_message || ''} onChange={e => setSettings({ ...settings, maintenance_message: e.target.value })}
              onBlur={() => saveSettings({ maintenance_message: settings.maintenance_message })} />
          </div>
        </div>

        {/* Session */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Session Secret</h2>
            <button className="btn btn-ghost" onClick={generateSessionSecret}>Regenerate</button>
          </div>
          <div className="input mono" style={{ opacity: 0.5 }}>••••••••••••••••••••••••••••</div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Used for JWT session signing. Regenerating will log out all admin sessions.</p>
        </div>

        {/* Danger Zone */}
        <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--danger)' }}>Danger Zone</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            These actions are irreversible. Be careful.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-danger" onClick={async () => {
              if (!confirm('Revoke ALL active keys? This cannot be undone.')) return;
              // Would need a bulk revoke API
              (window as any).showToast?.('Bulk revoke not yet implemented', 'warning');
            }}>
              Revoke All Keys
            </button>
            <button className="btn btn-danger" onClick={async () => {
              if (!confirm('Delete ALL connections? This cannot be undone.')) return;
              (window as any).showToast?.('Bulk delete not yet implemented', 'warning');
            }}>
              Clear All Connections
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
