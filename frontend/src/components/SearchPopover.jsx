import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import Avatar from './Avatar';
import { useChatStore } from '../store/chat';
import { SearchIcon, UsersIcon, HashIcon, EmojiIcon, ImageIcon } from './icons';

// app-style search: shows filter suggestions until the user types,
// then issues a real query against /api/search/messages and lists results.
const FILTERS = [
  { token: 'from:',     icon: <UsersIcon size={18} />, label: 'From a specific user',         hint: 'from: user' },
  { token: 'in:',       icon: <HashIcon size={18} />,  label: 'Sent in a specific channel',   hint: 'in: channel' },
  { token: 'has:',      icon: <ImageIcon size={18} />, label: 'Includes a specific type of data', hint: 'has: link, image or file' },
  { token: 'mentions:', icon: <EmojiIcon size={18} />, label: 'Mentions a specific user',     hint: 'mentions: user' },
];

export default function SearchPopover({ placeholder, onClose }) {
  const ref = useRef(null);
  const inputRef = useRef(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const currentServerId = useChatStore((s) => s.currentServerId);
  const selectChannel = useChatStore((s) => s.selectChannel);
  const channels = useChatStore((s) => s.channels);

  useEffect(() => {
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    inputRef.current?.focus();
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Debounced search
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const handle = setTimeout(async () => {
      setLoading(true); setErr(null);
      try {
        const { data } = await api.get('/search/messages', {
          params: { q, server_id: currentServerId || undefined, limit: 30 },
        });
        setResults(data.messages);
      } catch (e) {
        setErr(e?.response?.data?.error || e.message);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [q, currentServerId]);

  function insertFilter(token) {
    setQ((curr) => (curr ? curr + ' ' : '') + token);
    inputRef.current?.focus();
  }

  function jumpTo(m) {
    // If the message is in a channel we have loaded, switch to it; the user can scroll to find it.
    if (channels.find((c) => c.id === m.channel_id)) {
      selectChannel(m.channel_id);
    }
    onClose();
  }

  const showFilters = !q.trim();

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 w-[440px] max-h-[600px] bg-app-floating rounded-md shadow-elevation-high z-[60] overflow-hidden flex flex-col animate-modal-in">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-app-divider">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder || 'Search'}
          className="flex-1 bg-transparent outline-none text-app-interactive-active placeholder:text-app-muted text-sm"
        />
        {loading
          ? <span className="text-tiny text-app-header-secondary">…</span>
          : <SearchIcon size={18} className="text-app-muted" />
        }
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {showFilters ? (
          <div className="px-2 py-2">
            <div className="px-2 py-1 text-tiny uppercase font-bold tracking-wide text-app-header-secondary">
              Filters
            </div>
            {FILTERS.map((f) => (
              <button
                key={f.token}
                onClick={() => insertFilter(f.token)}
                className="w-full flex items-center gap-3 px-2 py-2 rounded text-left hover:bg-app-500 hover:text-white text-app-interactive-active row-hover group/f"
              >
                <span className="w-7 h-7 rounded-full bg-app-700 group-hover/f:bg-black/30 flex items-center justify-center text-app-interactive-active">
                  {f.icon}
                </span>
                <span className="flex-1">
                  <span className="block font-medium text-sm">{f.label}</span>
                  <span className="block text-tiny text-app-header-secondary group-hover/f:text-white/80">{f.hint}</span>
                </span>
              </button>
            ))}
            <div className="mt-3 px-2 py-1 text-tiny text-app-muted">
              Tip: combine tokens — <span className="font-mono text-app-header-secondary">hi from:alice has:image</span>
            </div>
          </div>
        ) : (
          <>
            <div className="px-3 py-2 text-tiny uppercase font-bold tracking-wide text-app-header-secondary border-b border-app-divider">
              {loading ? 'Searching…' : `${results.length} result${results.length === 1 ? '' : 's'}`}
            </div>
            {err && <div className="p-4 text-app-red text-sm">{err}</div>}
            {!loading && results.length === 0 && !err && (
              <div className="p-8 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-app-700 text-app-header-secondary flex items-center justify-center">
                  <SearchIcon size={22} />
                </div>
                <div className="mt-2 text-sm text-app-header">No results found</div>
                <div className="text-tiny text-app-header-secondary mt-1">
                  Try different keywords or remove a filter.
                </div>
              </div>
            )}
            <ul>
              {results.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => jumpTo(m)}
                    className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-app-700/40 row-hover border-b border-app-divider/50"
                  >
                    <Avatar name={m.display_name || m.username} src={m.avatar_url} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 text-sm">
                        <span className="font-semibold text-app-interactive-active truncate">
                          {m.display_name || m.username}
                        </span>
                        <span className="text-tiny text-app-header-secondary">
                          {new Date(m.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <div className="text-tiny text-app-header-secondary">
                        #{m.channel_name} · {m.server_name}
                      </div>
                      <div className="text-sm text-app-text mt-0.5 line-clamp-2">{m.content}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
