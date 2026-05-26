import { useEffect, useState } from 'react';
import api from '../../services/api';

function Stat({ label, value, color = 'text-app-header' }) {
  return (
    <div className="bg-app-900 rounded-lg p-4 ring-1 ring-black/20 row-hover hover:ring-app-divider transition-shadow">
      <div className="text-tiny uppercase tracking-wide font-bold text-app-header-secondary">{label}</div>
      <div className={`text-2xl sm:text-3xl font-extrabold mt-1 tabular-nums tracking-tight ${color}`}>{value ?? '—'}</div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get('/admin/stats')
      .then((r) => setStats(r.data))
      .catch((e) => setErr(e?.response?.data?.error || e.message));
  }, []);

  if (err) return <div className="text-app-red">{err}</div>;
  if (!stats) return <div className="text-app-muted">Loading…</div>;

  const max7d = Math.max(1, ...stats.messages_7d.map((d) => d.n));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="Users" value={stats.totals.users} />
        <Stat label="Admins" value={stats.totals.admins} color="text-app-link" />
        <Stat label="Blocked" value={stats.totals.blocked} color="text-app-red" />
        <Stat label="Servers" value={stats.totals.servers} />
        <Stat label="Channels" value={stats.totals.channels} />
        <Stat label="Messages" value={stats.totals.messages} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Stat label="Active users (24h)" value={stats.active_24h} color="text-app-green" />
        <Stat label="New users (7d)" value={stats.new_users_7d} color="text-app-green" />
      </div>

      <div className="bg-app-900 rounded-lg p-4 ring-1 ring-black/20">
        <div className="text-[11px] uppercase tracking-wide font-semibold text-app-muted mb-3">Messages — last 7 days</div>
        {stats.messages_7d.length === 0 ? (
          <div className="text-app-muted text-sm py-8 text-center">No messages yet.</div>
        ) : (
          <div className="flex items-end gap-2 h-32 sm:h-40">
            {stats.messages_7d.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full bg-gradient-to-t from-app-400 to-app-500 rounded-t"
                    style={{ height: `${Math.max(2, (d.n / max7d) * 100)}%` }}
                    title={`${d.n} messages`}
                  />
                </div>
                <div className="text-[10px] text-app-muted">{d.day.slice(5)}</div>
                <div className="text-[10px] text-white">{d.n}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-app-900 rounded-lg p-4 ring-1 ring-black/20">
        <div className="text-[11px] uppercase tracking-wide font-semibold text-app-muted mb-3">Top servers by messages</div>
        {stats.top_servers.length === 0 ? (
          <div className="text-app-muted text-sm py-4">No servers yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[300px]">
              <thead className="text-app-muted text-left">
                <tr><th className="py-1">Server</th><th className="py-1 text-right">Messages</th></tr>
              </thead>
              <tbody>
                {stats.top_servers.map((s) => (
                  <tr key={s.id} className="border-t border-app-divider">
                    <td className="py-2 text-white">{s.name}</td>
                    <td className="py-2 text-right">{s.messages}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
