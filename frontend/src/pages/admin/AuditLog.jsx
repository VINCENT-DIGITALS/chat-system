import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function AuditLog() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get('/admin/audit-log')
      .then((r) => setEntries(r.data.entries))
      .catch((e) => setErr(e?.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-white mb-4">Audit Log</h1>
      {err && <div className="text-app-red mb-3 bg-app-red/15 px-3 py-2 rounded">{err}</div>}
      {loading && <div className="text-app-muted mb-3">Loading…</div>}

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {entries.map((e) => (
          <div key={e.id} className="bg-app-900 rounded p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <code className="text-app-link text-xs">{e.action}</code>
              <span className="text-[11px] text-app-muted">{new Date(e.created_at).toLocaleString()}</span>
            </div>
            <div className="text-app-text text-xs mt-1">by {e.actor_username || '—'}</div>
            {e.target_type && (
              <div className="text-app-muted text-[11px] mt-0.5">target: {e.target_type}:{e.target_id || ''}</div>
            )}
            {e.details && (
              <pre className="text-[11px] text-app-muted whitespace-pre-wrap mt-1">{JSON.stringify(e.details, null, 0)}</pre>
            )}
          </div>
        ))}
        {!loading && entries.length === 0 && (
          <div className="text-center text-app-muted py-8">No entries yet.</div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-app-900 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-app-muted bg-black/20">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-app-divider align-top hover:bg-app-700/30">
                <td className="px-3 py-2 text-app-muted whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                <td className="px-3 py-2 text-white">{e.actor_username || '—'}</td>
                <td className="px-3 py-2"><code className="text-app-link">{e.action}</code></td>
                <td className="px-3 py-2 text-app-muted">
                  {e.target_type ? `${e.target_type}:${e.target_id || ''}` : '—'}
                </td>
                <td className="px-3 py-2">
                  {e.details && <pre className="text-[11px] text-app-muted whitespace-pre-wrap">{JSON.stringify(e.details, null, 0)}</pre>}
                </td>
              </tr>
            ))}
            {!loading && entries.length === 0 && (
              <tr><td colSpan="5" className="px-3 py-6 text-center text-app-muted">No entries yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
