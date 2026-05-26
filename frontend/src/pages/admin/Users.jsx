import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { SearchIcon, CloseIcon } from '../../components/icons';

function Badge({ kind, children, title }) {
  const styles = {
    admin: 'bg-app-500/20 text-app-link',
    blocked: 'bg-app-red/20 text-app-red',
  };
  return (
    <span title={title} className={`inline-block text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded ${styles[kind] || ''}`}>
      {children}
    </span>
  );
}

export default function Users() {
  const me = useAuthStore((s) => s.user);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [blockTarget, setBlockTarget] = useState(null);
  const [blockReason, setBlockReason] = useState('');

  async function load(search = '') {
    setLoading(true);
    setErr(null);
    try {
      const { data } = await api.get('/admin/users', { params: { q: search } });
      setUsers(data.users);
      setTotal(data.total);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(''); }, []);

  async function action(u, kind, body) {
    try {
      if (kind === 'delete') {
        if (!confirm(`Permanently delete ${u.username}? This wipes their messages too.`)) return;
        await api.delete(`/admin/users/${u.id}`);
      } else {
        await api.post(`/admin/users/${u.id}/${kind}`, body || {});
      }
      await load(q);
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    }
  }

  async function submitBlock(e) {
    e.preventDefault();
    if (!blockTarget) return;
    await action(blockTarget, 'block', { reason: blockReason });
    setBlockTarget(null);
    setBlockReason('');
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          Users <span className="text-app-muted text-sm font-normal">({total})</span>
        </h1>
        <form
          onSubmit={(e) => { e.preventDefault(); load(q); }}
          className="relative flex items-center"
        >
          <SearchIcon size={16} className="absolute left-3 text-app-muted" />
          <input
            placeholder="Search username or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="bg-app-900 outline-none rounded pl-9 pr-3 py-2 text-white text-sm w-full sm:w-72 focus:ring-2 focus:ring-app-500"
          />
        </form>
      </div>

      {err && <div className="text-app-red mb-3 bg-app-red/15 px-3 py-2 rounded">{err}</div>}
      {loading && <div className="text-app-muted mb-3">Loading…</div>}

      {/* Mobile: cards. Desktop: table */}
      <div className="md:hidden space-y-2">
        {users.map((u) => (
          <div key={u.id} className="bg-app-900 rounded p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-white truncate">
                  {u.username}
                  {u.id === me?.id && <span className="ml-2 text-xs text-app-muted font-normal">(you)</span>}
                </div>
                <div className="text-xs text-app-muted truncate">{u.email}</div>
                <div className="text-[11px] text-app-muted mt-0.5">{new Date(u.created_at).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-1 flex-wrap justify-end">
                {u.is_admin && <Badge kind="admin">admin</Badge>}
                {u.is_blocked && <Badge kind="blocked" title={u.blocked_reason || ''}>blocked</Badge>}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {u.is_blocked ? (
                <button onClick={() => action(u, 'unblock')} className="text-app-green hover:underline text-xs px-2 py-1">Unblock</button>
              ) : (
                <button
                  onClick={() => { setBlockTarget(u); setBlockReason(''); }}
                  disabled={u.id === me?.id}
                  className="text-app-red hover:underline text-xs px-2 py-1 disabled:opacity-30"
                >Block</button>
              )}
              {u.is_admin ? (
                <button
                  onClick={() => action(u, 'demote')}
                  disabled={u.id === me?.id}
                  className="text-app-muted hover:underline text-xs px-2 py-1 disabled:opacity-30"
                >Demote</button>
              ) : (
                <button onClick={() => action(u, 'promote')} className="text-app-link hover:underline text-xs px-2 py-1">Promote</button>
              )}
              <button
                onClick={() => action(u, 'delete')}
                disabled={u.id === me?.id}
                className="text-app-red hover:underline text-xs px-2 py-1 disabled:opacity-30 ml-auto"
              >Delete</button>
            </div>
          </div>
        ))}
        {!loading && users.length === 0 && (
          <div className="text-center text-app-muted py-8">No users.</div>
        )}
      </div>

      <div className="hidden md:block bg-app-900 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-app-muted bg-black/20">
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Flags</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-app-divider hover:bg-app-700/30">
                <td className="px-3 py-2 text-white">
                  {u.username}
                  {u.id === me?.id && <span className="ml-2 text-xs text-app-muted">(you)</span>}
                </td>
                <td className="px-3 py-2 text-app-muted">{u.email}</td>
                <td className="px-3 py-2 text-app-muted whitespace-nowrap">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2 space-x-1">
                  {u.is_admin && <Badge kind="admin">admin</Badge>}
                  {u.is_blocked && <Badge kind="blocked" title={u.blocked_reason || ''}>blocked</Badge>}
                </td>
                <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                  {u.is_blocked ? (
                    <button onClick={() => action(u, 'unblock')} className="text-app-green hover:underline text-xs">Unblock</button>
                  ) : (
                    <button
                      onClick={() => { setBlockTarget(u); setBlockReason(''); }}
                      disabled={u.id === me?.id}
                      className="text-app-red hover:underline text-xs disabled:opacity-30"
                    >Block</button>
                  )}
                  {u.is_admin ? (
                    <button
                      onClick={() => action(u, 'demote')}
                      disabled={u.id === me?.id}
                      className="text-app-muted hover:underline text-xs disabled:opacity-30"
                    >Demote</button>
                  ) : (
                    <button onClick={() => action(u, 'promote')} className="text-app-link hover:underline text-xs">Promote</button>
                  )}
                  <button
                    onClick={() => action(u, 'delete')}
                    disabled={u.id === me?.id}
                    className="text-app-red hover:underline text-xs disabled:opacity-30"
                  >Delete</button>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr><td colSpan="5" className="px-3 py-6 text-center text-app-muted">No users.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {blockTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
          <form onSubmit={submitBlock} className="bg-app-800 rounded-md w-full max-w-md shadow-elevation overflow-hidden">
            <div className="flex items-start justify-between px-6 pt-6">
              <h3 className="text-lg font-bold text-white">Block {blockTarget.username}?</h3>
              <button type="button" onClick={() => setBlockTarget(null)} className="text-app-muted hover:text-white p-1 -mr-2 -mt-1">
                <CloseIcon size={20} />
              </button>
            </div>
            <div className="px-6 py-4">
              <label className="text-xs uppercase font-semibold tracking-wide text-app-muted">Reason (optional)</label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full mt-1.5 bg-app-950 rounded p-2 text-white outline-none focus:ring-2 focus:ring-app-500 resize-none"
                rows={3}
              />
            </div>
            <div className="bg-app-900 px-6 py-4 flex justify-end gap-2">
              <button type="button" onClick={() => setBlockTarget(null)} className="text-app-text px-3 py-2 text-sm hover:underline">Cancel</button>
              <button type="submit" className="bg-app-red hover:bg-app-red/80 text-white px-4 py-2 text-sm font-medium rounded">Block</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
