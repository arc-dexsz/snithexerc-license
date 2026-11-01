'use client';

import { useEffect, useState } from 'react';

interface Stats {
  keys_total: number;
  keys_active: number;
  keys_revoked: number;
  keys_expired: number;
  servers_count: number;
  connections_total: number;
  connections_today: number;
  endpoints_count: number;
  chart_data: { day: string; count: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(d => {
      if (d.ok) setStats(d.stats);
    }).catch(() => {});

    fetch('/api/admin/connections?limit=5').then(r => r.json()).then(d => {
      if (d.ok) setRecent(d.connections);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!stats?.chart_data) return;
    // Simple chart with Chart.js CDN
    const loadChart = async () => {
      if (typeof window === 'undefined') return;
      const Chart = (window as any).Chart;
      if (!Chart) return;

      const canvas = document.getElementById('connectionsChart') as HTMLCanvasElement;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      new Chart(ctx, {
        type: 'line',
        data: {
          labels: stats.chart_data.map(d => d.day),
          datasets: [{
            label: 'Connections',
            data: stats.chart_data.map(d => d.count),
            borderColor: '#22d3ee',
            backgroundColor: 'rgba(34, 211, 238, 0.1)',
            fill: true,
            tension: 0.4,
          }],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: '#27272a' }, ticks: { color: '#a1a1aa' } },
            y: { grid: { color: '#27272a' }, ticks: { color: '#a1a1aa' }, beginAtZero: true },
          },
        },
      });
    };

    // Load Chart.js from CDN
    if (!(window as any).Chart) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = loadChart;
      document.head.appendChild(script);
    } else {
      loadChart();
    }
  }, [stats]);

  if (!stats) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.keys_total}</div>
          <div className="stat-label">Total Keys</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.keys_active}</div>
          <div className="stat-label">Active Keys</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats.connections_today}</div>
          <div className="stat-label">Connections Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.servers_count}</div>
          <div className="stat-label">Servers</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Connections (7 days)</h2>
          <canvas id="connectionsChart" height="200" />
          {(!stats.chart_data || stats.chart_data.length === 0) && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No data yet</p>
          )}
        </div>

        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Recent Connections</h2>
          {recent.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No connections yet</p>
          ) : (
            <div style={{ fontSize: 13 }}>
              {recent.map((c: any) => (
                <div key={c.id} style={{
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}>
                  <span className="mono">{c.ip}</span>
                  <span className={`badge badge-${c.status === 'success' ? 'active' : 'revoked'}`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div className="card" style={{ display: 'flex', gap: 32 }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Revoked Keys</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--danger)' }}>{stats.keys_revoked}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Expired Keys</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--warning)' }}>{stats.keys_expired}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Total Connections</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.connections_total}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Custom Endpoints</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.endpoints_count}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
