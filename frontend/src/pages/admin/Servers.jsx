import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function Servers() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const { data } = await api.get('/admin/servers');
      setServers(data.servers);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function del(s) {
    if (!confirm(`Delete server "${s.name}" and all its channels/messages?`)) return;
    try {
      await api.delete(`/admin/servers/${s.id}`);
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-white mb-4">Servers</h1>
      {err && <div className="text-app-red mb-3 bg-app-red/15 px-3 py-2 rounded">{err}</div>}
      {loading && <div className="text-app-muted mb-3">Loading…</div>}

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {servers.map((s) => (
          <div key={s.id} className="bg-app-900 rounded p-3">
            <div className="flex justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-white truncate">{s.name}</div>
                <div className="text-xs text-app-muted">Owner: {s.owner_username || '—'}</div>
                <div className="text-[11px] text-app-muted mt-0.5">
                  {s.member_count} members · {s.channel_count} channels
                </div>
                <code className="text-[11px] text-app-link mt-1 block">{s.invite_code}</code>
              </div>
              <button onClick={() => del(s)} className="text-app-red hover:underline text-xs self-start">Delete</button>
            </div>
          </div>
        ))}
        {!loading && servers.length === 0 && (
          <div className="text-center text-app-muted py-8">No servers.</div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-app-900 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-app-muted bg-black/20">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Members</th>
              <th className="px-3 py-2">Channels</th>
              <th className="px-3 py-2">Invite</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {servers.map((s) => (
              <tr key={s.id} className="border-t border-app-divider hover:bg-app-700/30">
                <td className="px-3 py-2 text-white">{s.name}</td>
                <td className="px-3 py-2 text-app-muted">{s.owner_username || '—'}</td>
                <td className="px-3 py-2">{s.member_count}</td>
                <td className="px-3 py-2">{s.channel_count}</td>
                <td className="px-3 py-2"><code className="text-xs text-app-link">{s.invite_code}</code></td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => del(s)} className="text-app-red hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {!loading && servers.length === 0 && (
              <tr><td colSpan="6" className="px-3 py-6 text-center text-app-muted">No servers.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
