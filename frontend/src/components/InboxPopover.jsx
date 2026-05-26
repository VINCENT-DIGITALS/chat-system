import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import Avatar from './Avatar';
import { InboxStackIcon, CheckIcon, EmojiIcon } from './icons';

const TABS = [
  { id: 'for-you', label: 'For You' },
  { id: 'unreads', label: 'Unreads' },
  { id: 'mentions', label: 'Mentions' },
];

export default function InboxPopover({ onClose }) {
  const ref = useRef(null);
  const [tab, setTab] = useState('for-you');
  const [data, setData] = useState({ mentions: [], unreads: [], forYou: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      api.get('/inbox/mentions'),
      api.get('/inbox/unreads'),
      api.get('/inbox/for-you'),
    ]).then(([m, u, f]) => {
      if (!alive) return;
      setData({ mentions: m.data.mentions || [], unreads: u.data.messages || [], forYou: f.data.items || [] });
    }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 w-[440px] max-h-[600px] bg-app-floating rounded-md shadow-elevation-high z-[60] overflow-hidden flex flex-col animate-modal-in">
      <div className="flex items-center gap-2 px-4 pt-4">
        <InboxStackIcon size={18} className="text-app-interactive-active" />
        <div className="text-base font-bold text-app-header">Inbox</div>
        <button
          className="ml-auto px-2 py-1 rounded hover:bg-app-700 row-hover text-app-interactive hover:text-app-interactive-active"
          onClick={async () => {
            try { await api.post('/inbox/mentions/read'); } catch (_) {}
          }}
          title="Mark all as read"
        >
          <CheckIcon size={16} />
        </button>
      </div>

      <div className="flex border-b border-app-divider mt-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              'flex-1 py-2 text-sm font-medium relative ' +
              (tab === t.id ? 'text-app-link' : 'text-app-header-secondary hover:text-app-interactive-active')
            }
          >
            {t.label}
            {tab === t.id && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[2px] bg-app-link rounded-full" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading && <div className="p-8 text-center text-app-header-secondary text-sm">Loading…</div>}

        {!loading && tab === 'for-you' && (
          data.forYou.length === 0 ? (
            <EmptyState title="No new activity" sub="Server joins and friend requests will show up here." />
          ) : (
            <ul>
              {data.forYou.map((i) => (
                <li key={i.server_id} className="px-4 py-3 hover:bg-app-700/40 row-hover border-b border-app-divider/50">
                  <div className="text-sm text-app-interactive-active">You joined <span className="font-bold">{i.server_name}</span></div>
                  <div className="text-tiny text-app-header-secondary">{new Date(i.joined_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )
        )}

        {!loading && tab === 'unreads' && (
          data.unreads.length === 0 ? (
            <EmptyState title="Nothing unread" sub="You're all caught up." />
          ) : (
            <ul>
              {data.unreads.map((m) => (
                <li key={m.id} className="px-4 py-3 hover:bg-app-700/40 row-hover border-b border-app-divider/50">
                  <div className="flex items-start gap-2">
                    <Avatar name={m.display_name || m.username} src={m.avatar_url} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">
                        <span className="font-semibold text-app-interactive-active">{m.display_name || m.username}</span>
                        <span className="text-tiny text-app-header-secondary ml-2">#{m.channel_name} · {m.server_name}</span>
                      </div>
                      <div className="text-sm text-app-text truncate">{m.content}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}

        {!loading && tab === 'mentions' && (
          data.mentions.length === 0 ? (
            <div className="px-8 py-10 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-app-700 text-app-header-secondary flex items-center justify-center">
                <EmojiIcon size={28} />
              </div>
              <div className="text-app-header font-bold mt-3">You made it through everything!</div>
              <div className="text-tiny text-app-header-secondary mt-1">
                <span className="text-app-green font-bold">PROTIP:</span> Whenever someone mentions you it will be saved here for 7 days.
              </div>
            </div>
          ) : (
            <ul>
              {data.mentions.map((m) => (
                <li key={m.id} className="px-4 py-3 hover:bg-app-700/40 row-hover border-b border-app-divider/50">
                  <div className="flex items-start gap-2">
                    <Avatar name={m.display_name || m.username} src={m.avatar_url} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">
                        <span className="font-semibold text-app-interactive-active">{m.display_name || m.username}</span>
                        <span className="text-tiny text-app-header-secondary ml-2">#{m.channel_name} · {m.server_name}</span>
                      </div>
                      <div className="text-sm text-app-text">{m.content}</div>
                      <div className="text-tiny text-app-header-secondary mt-0.5">{new Date(m.message_created_at).toLocaleString()}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, sub }) {
  return (
    <div className="px-8 py-10 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-app-700 text-app-header-secondary flex items-center justify-center">
        <InboxStackIcon size={28} />
      </div>
      <div className="text-app-header font-bold mt-3">{title}</div>
      <div className="text-tiny text-app-header-secondary mt-1">{sub}</div>
    </div>
  );
}
