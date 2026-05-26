import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../store/chat';
import { useAuthStore } from '../store/auth';
import api from '../services/api';
import Avatar from './Avatar';
import {
  CloseIcon, CogIcon, ShieldIcon, MicIcon, HeadphoneIcon, PlusIcon, UsersIcon,
  HashIcon, SearchIcon,
} from './icons';
import { classNames } from '../lib/utils';

function NewConversationModal({ onClose }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]); // [{id, username, display_name, avatar_url}]
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState('');
  const openDMWith = useChatStore((s) => s.openDMWith);
  const createGroupDM = useChatStore((s) => s.createGroupDM);
  const servers = useChatStore((s) => s.servers);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!q.trim() || servers.length === 0) {
        // Fallback: aggregate members from joined servers, dedupe
        const seen = new Map();
        for (const s of servers.slice(0, 3)) {
          try {
            const { data } = await api.get(`/servers/${s.id}/members`);
            for (const m of data.members || []) seen.set(m.id, m);
          } catch (_) {}
          if (cancelled) return;
        }
        setResults(Array.from(seen.values()).slice(0, 30));
        return;
      }
      setLoading(true);
      try {
        // Search via the existing /search endpoint if it supports users; else
        // fall back to aggregated member list filtered locally.
        const seen = new Map();
        for (const s of servers) {
          try {
            const { data } = await api.get(`/servers/${s.id}/members`);
            for (const m of data.members || []) seen.set(m.id, m);
          } catch (_) {}
          if (cancelled) return;
        }
        const needle = q.toLowerCase();
        const list = Array.from(seen.values()).filter((u) =>
          (u.username || '').toLowerCase().includes(needle) ||
          (u.display_name || '').toLowerCase().includes(needle)
        );
        setResults(list.slice(0, 30));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [q, servers]);

  function toggleSelect(u) {
    setSelected((cur) =>
      cur.find((c) => c.id === u.id)
        ? cur.filter((c) => c.id !== u.id)
        : [...cur, u]
    );
  }

  async function submit() {
    try {
      if (selected.length === 1) {
        await openDMWith(selected[0].id);
      } else if (selected.length > 1) {
        await createGroupDM(groupName.trim() || null, selected.map((u) => u.id));
      } else {
        return;
      }
      onClose();
    } catch (_) { /* swallow */ }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-start sm:items-center justify-center p-4 animate-fade-in">
      <div className="bg-app-800 rounded-md w-full max-w-md shadow-elevation overflow-hidden animate-modal-in">
        <div className="px-6 pt-5 pb-3 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-app-header">New Message</h3>
            <p className="text-tiny text-app-header-secondary mt-1">
              Pick one person for a direct message, or multiple to start a group chat.
            </p>
          </div>
          <button onClick={onClose} className="text-app-interactive hover:text-app-interactive-active p-1 -mt-1 -mr-2 row-hover rounded">
            <CloseIcon size={20} />
          </button>
        </div>
        <div className="px-6 pb-2">
          <div className="relative">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find or start a conversation"
              className="w-full bg-app-950 outline-none rounded pl-9 pr-3 py-2 text-app-interactive-active focus:ring-2 focus:ring-app-500"
            />
          </div>
          {selected.length > 1 && (
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name (optional)"
              className="mt-2 w-full bg-app-950 outline-none rounded px-3 py-2 text-app-interactive-active focus:ring-2 focus:ring-app-500"
            />
          )}
        </div>

        <div className="max-h-[320px] overflow-y-auto scrollbar-thin px-2 py-1">
          {loading && <div className="text-tiny text-app-muted px-3 py-2">Loading…</div>}
          {!loading && results.length === 0 && (
            <div className="text-tiny text-app-muted px-3 py-2">No people found.</div>
          )}
          {results.map((u) => {
            const isMe = u.id === (useAuthStore.getState().user?.id);
            if (isMe) return null;
            const sel = !!selected.find((s) => s.id === u.id);
            return (
              <button
                key={u.id}
                onClick={() => toggleSelect(u)}
                className={classNames(
                  'w-full flex items-center gap-3 px-2 py-2 rounded row-hover text-left',
                  sel ? 'bg-app-500/15 ring-1 ring-app-500/40' : 'hover:bg-app-700/40'
                )}
              >
                <Avatar name={u.display_name || u.username} src={u.avatar_url} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-app-interactive-active truncate">
                    {u.display_name || u.username}
                  </span>
                  <span className="block text-tiny text-app-header-secondary truncate">@{u.username}</span>
                </span>
                <span className={classNames(
                  'w-4 h-4 rounded-sm border',
                  sel ? 'bg-app-500 border-app-500' : 'border-app-divider'
                )} />
              </button>
            );
          })}
        </div>

        <div className="bg-app-secondary-alt px-6 py-3 flex justify-end gap-2 border-t border-app-divider">
          <button onClick={onClose} className="px-4 py-2 text-app-interactive-active text-sm hover:underline">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={selected.length === 0}
            className="px-5 py-2 bg-app-500 hover:bg-app-400 disabled:opacity-50 text-white text-sm font-medium rounded press-feedback"
          >
            {selected.length > 1 ? `Start group (${selected.length})` : 'Start chat'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConversationButton({ conv, active, me, onClick }) {
  const others = Array.isArray(conv.others) ? conv.others : [];
  const isGroup = conv.is_group;
  const label = isGroup
    ? (conv.name || others.map((o) => o.display_name || o.username).join(', ') || 'Group')
    : (others[0]?.display_name || others[0]?.username || 'Direct message');
  const avatarSrc = isGroup ? conv.icon_url : others[0]?.avatar_url;
  const status = !isGroup ? others[0]?.status : null;
  const preview = conv.last_message?.deleted_at
    ? '[Message deleted]'
    : (conv.last_message?.content || '').slice(0, 60);
  return (
    <button
      onClick={onClick}
      className={classNames(
        'w-full flex items-center gap-3 px-2 py-2 rounded text-left row-hover',
        active
          ? 'bg-[rgba(78,80,88,0.55)] text-app-interactive-active'
          : 'hover:bg-app-700/40 text-app-channel hover:text-app-interactive-active'
      )}
    >
      <div className="relative shrink-0">
        {isGroup ? (
          <div className="w-9 h-9 rounded-full bg-app-700 flex items-center justify-center text-app-interactive">
            <UsersIcon size={18} />
          </div>
        ) : (
          <Avatar name={label} src={avatarSrc} size={36} status={status} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-app-interactive-active truncate">{label}</div>
        {preview && (
          <div className="text-tiny text-app-header-secondary truncate">{preview}</div>
        )}
      </div>
    </button>
  );
}

export default function DMSidebar() {
  const navigate = useNavigate();
  const {
    dmConversations, currentConversationId, selectConversation, loadDMs,
  } = useChatStore();
  const me = useAuthStore((s) => s.user);
  const [newOpen, setNewOpen] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    loadDMs().catch(() => {});
  }, [loadDMs]);

  const filtered = (dmConversations || []).filter((c) => {
    if (!q.trim()) return true;
    const others = c.others || [];
    const hay = [
      c.name || '',
      ...others.map((o) => `${o.display_name || ''} ${o.username || ''}`),
    ].join(' ').toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <aside className="w-60 bg-app-900 flex flex-col shrink-0 h-full">
      <header className="h-12 px-3 flex items-center shadow-channel-header shrink-0">
        <div className="flex items-center gap-2 px-2 py-1 bg-app-950 rounded text-app-muted hover:text-app-interactive-active row-hover w-full">
          <SearchIcon size={14} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a conversation"
            className="bg-transparent outline-none flex-1 text-app-interactive-active text-sm placeholder:text-app-muted"
          />
        </div>
      </header>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-1">
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-3 px-2 py-2 rounded text-left text-app-interactive hover:bg-app-700/40 hover:text-app-interactive-active row-hover"
        >
          <UsersIcon size={20} />
          <span className="text-sm font-semibold">Friends</span>
        </button>

        <div className="mt-3 px-2 flex items-center justify-between">
          <span className="text-tiny uppercase font-bold tracking-wide text-app-header-secondary">
            Direct Messages
          </span>
          <button
            onClick={() => setNewOpen(true)}
            title="New message"
            className="p-1 text-app-header-secondary hover:text-app-interactive-active row-hover rounded"
          >
            <PlusIcon size={14} />
          </button>
        </div>

        <div className="space-y-[2px] mt-1">
          {filtered.length === 0 && (
            <div className="text-tiny text-app-muted px-2 py-3">
              No conversations yet. Click <span className="text-app-interactive-active">+</span> to start one.
            </div>
          )}
          {filtered.map((c) => (
            <ConversationButton
              key={c.id}
              conv={c}
              active={currentConversationId === c.id}
              me={me}
              onClick={() => selectConversation(c.id)}
            />
          ))}
        </div>
      </nav>

      {/* User bar (same as ChannelSidebar) */}
      <div className="h-[52px] px-2 bg-app-secondary-alt flex items-center justify-between gap-0.5 shrink-0">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 min-w-0 px-1 py-1 rounded hover:bg-app-700/60 row-hover flex-1 press-feedback"
          title="My Account"
        >
          <div className="relative shrink-0">
            <Avatar name={me?.display_name || me?.username} src={me?.avatar_url} size={32} status={me?.status || 'online'} />
          </div>
          <div className="min-w-0 leading-tight text-left">
            <div className="text-sm font-semibold text-app-interactive-active truncate">
              {me?.display_name || me?.username}
            </div>
            <div className="text-tiny text-app-header-secondary truncate">@{me?.username}</div>
          </div>
        </button>
        <div className="flex items-center">
          {me?.is_admin && (
            <button
              onClick={() => navigate('/admin')}
              className="p-2 text-app-interactive hover:text-app-interactive-active hover:bg-app-700/60 row-hover rounded press-feedback ring-focus"
              title="Admin panel"
            >
              <ShieldIcon size={18} />
            </button>
          )}
          <button
            onClick={() => navigate('/settings')}
            className="p-2 text-app-interactive hover:text-app-interactive-active hover:bg-app-700/60 row-hover rounded press-feedback ring-focus"
            title="User Settings"
          >
            <CogIcon size={18} />
          </button>
        </div>
      </div>

      {newOpen && <NewConversationModal onClose={() => setNewOpen(false)} />}
    </aside>
  );
}
