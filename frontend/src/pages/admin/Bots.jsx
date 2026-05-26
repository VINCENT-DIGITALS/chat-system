import { useEffect, useState } from 'react';
import api from '../../services/api';
import { BotBadge } from '../../components/Badge';
import { SearchIcon, BotIcon } from '../../components/icons';

export default function Bots() {
  const [bots, setBots] = useState([]);
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const { data } = await api.get('/admin/bots');
      setBots(data.bots);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally { setLoading(false); }
  }

  async function search(s = '') {
    try {
      const { data } = await api.get('/admin/users', { params: { q: s } });
      setUsers(data.users.filter((u) => !u.is_bot));
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => { load(); search(''); }, []);

  async function makeBot(u) {
    try {
      await api.post(`/admin/users/${u.id}/make-bot`);
      await load();
      await search(q);
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    }
  }

  async function unmakeBot(u) {
    if (!confirm(`Remove bot status from ${u.username}?`)) return;
    try {
      await api.post(`/admin/users/${u.id}/unmake-bot`);
      await load();
      await search(q);
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <BotIcon size={22} className="text-app-500" />
        <h1 className="text-xl sm:text-2xl font-bold text-app-header tracking-tight">Bots</h1>
      </div>

      <p className="text-app-header-secondary text-sm mb-5">
        Mark any user account as a Bot to display the <BotBadge size="sm" /> badge inline beside their name in chat and member list.
        Bots use the same auth as regular users — they just need to log in and post messages via the API.
      </p>

      {err && <div className="text-app-red mb-3 bg-app-red/15 px-3 py-2 rounded">{err}</div>}

      {/* Current bots */}
      <h2 className="text-tiny uppercase font-bold tracking-wide text-app-header-secondary mb-2">
        Bot accounts ({bots.length})
      </h2>
      <div className="bg-app-900 rounded-lg overflow-hidden mb-6">
        {bots.length === 0 ? (
          <div className="px-4 py-6 text-center text-app-header-secondary text-sm">
            No bots yet. Promote a user below.
          </div>
        ) : (
          <ul className="divide-y divide-app-divider">
            {bots.map((b) => (
              <li key={b.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-app-500 text-white flex items-center justify-center font-bold text-sm">
                  {b.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-app-interactive-active text-sm font-medium flex items-center">
                    {b.username}<BotBadge size="sm" />
                  </div>
                  <div className="text-tiny text-app-header-secondary truncate">{b.email}</div>
                </div>
                <button
                  onClick={() => unmakeBot(b)}
                  className="text-app-red hover:underline text-xs"
                >
                  Remove Bot Status
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Promote */}
      <h2 className="text-tiny uppercase font-bold tracking-wide text-app-header-secondary mb-2">
        Promote a user to bot
      </h2>
      <div className="relative mb-3">
        <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); search(e.target.value); }}
          placeholder="Search username or email"
          className="w-full bg-app-950 rounded pl-9 pr-3 py-2 text-app-interactive-active text-sm focus:ring-2 focus:ring-app-500 outline-none"
        />
      </div>
      <div className="bg-app-900 rounded-lg overflow-hidden">
        {users.length === 0 ? (
          <div className="px-4 py-6 text-center text-app-header-secondary text-sm">
            No matching users.
          </div>
        ) : (
          <ul className="divide-y divide-app-divider max-h-96 overflow-y-auto scrollbar-thin">
            {users.slice(0, 25).map((u) => (
              <li key={u.id} className="px-4 py-2 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-app-700 text-app-interactive-active flex items-center justify-center text-xs font-bold">
                  {u.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-app-interactive-active text-sm font-medium truncate">{u.username}</div>
                  <div className="text-tiny text-app-header-secondary truncate">{u.email}</div>
                </div>
                <button
                  onClick={() => makeBot(u)}
                  className="bg-app-500 hover:bg-app-400 text-white text-xs font-medium px-3 py-1.5 rounded press-feedback"
                >
                  Make Bot
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
