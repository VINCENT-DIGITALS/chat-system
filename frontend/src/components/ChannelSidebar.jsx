import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { classNames } from '../lib/utils';
import { useChatStore } from '../store/chat';
import { useAuthStore } from '../store/auth';
import {
  HashIcon, SpeakerIcon, VideoIcon, PlusIcon, LogoutIcon,
  ChevronDownIcon, CloseIcon, ShieldIcon, CogIcon, MicIcon, HeadphoneIcon,
  CalendarIcon, BellNotifIcon, ChatBubbleIcon, StarIcon,
} from './icons';
import api from '../services/api';
import Toast from './Toast';
import Avatar from './Avatar';
import { BotBadge } from './Badge';
import { ChannelSkeletons } from './Skeleton';
import EventsModal from './EventsModal';
import ServerSettingsModal from './ServerSettingsModal';

function ChannelIcon({ type, size = 20, className = '' }) {
  const cls = 'text-app-channel ' + className;
  if (type === 'voice')        return <SpeakerIcon size={size} className={cls} />;
  if (type === 'video')        return <VideoIcon size={size} className={cls} />;
  if (type === 'announcement') return <BellNotifIcon size={size} className={cls} />;
  if (type === 'forum')        return <ChatBubbleIcon size={size} className={cls} />;
  if (type === 'stage')        return <StarIcon size={size} className={cls} />;
  return <HashIcon size={size} className={cls} />;
}

export default function ChannelSidebar() {
  const {
    servers, currentServerId, channels, channelCategories,
    currentChannelId, selectChannel, createChannel,
  } = useChatStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const server = servers.find((s) => s.id === currentServerId);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const [eventsOpen, setEventsOpen] = useState(false);
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const myMember = useChatStore((s) => s.members.find((m) => m.id === useAuthStore.getState().user?.id));
  const isServerAdmin = myMember ? ['owner', 'admin'].includes(myMember.role) : false;

  async function submitCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createChannel(currentServerId, name.trim(), type);
      setName('');
      setType('text');
      setShowCreate(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function copyInvite() {
    if (!server?.invite_code) return;
    try {
      await navigator.clipboard.writeText(server.invite_code);
      setToast(true);
      setTimeout(() => setToast(false), 1600);
    } catch (_) { /* ignore */ }
  }

  // Channels without a category, grouped by type
  const uncategorized = channels.filter((c) => !c.category_id);
  const byType = (list, t) => list.filter((c) => c.type === t);

  // Build "Uncategorized" + actual categories — categories ordered by position
  const orderedCategories = [...(channelCategories || [])].sort(
    (a, b) => (a.position - b.position) || a.created_at.localeCompare(b.created_at)
  );

  async function createCategory() {
    if (!categoryName.trim()) return;
    try {
      await api.post(`/channels/server/${currentServerId}/category`, { name: categoryName.trim() });
      const { data } = await api.get(`/channels/server/${currentServerId}`);
      useChatStore.setState({
        channels: data.channels,
        channelCategories: data.categories || [],
      });
      setCategoryName('');
      setCreateCategoryOpen(false);
    } catch (_) { /* swallow */ }
  }

  function ChannelButton({ c }) {
    const active = currentChannelId === c.id;
    return (
      <button
        onClick={() => selectChannel(c.id)}
        className={classNames(
          'group/row relative w-full flex items-center gap-1.5 pl-2 pr-2 py-[5px] rounded-[4px] text-[16px] text-left row-hover',
          active
            ? 'bg-[rgba(78,80,88,0.5)] text-app-interactive-active'
            : 'text-app-channel hover:bg-[rgba(78,80,88,0.3)] hover:text-app-interactive-hover'
        )}
      >
        <ChannelIcon type={c.type} size={20} className={active ? 'text-app-interactive-active' : ''} />
        <span className={classNames('truncate flex-1 font-medium', active ? 'text-app-interactive-active' : '')}>
          {c.name}
        </span>
        {active && (
          <span className="absolute left-0 top-1 bottom-1 w-[3px] bg-white rounded-r-full" />
        )}
      </button>
    );
  }

  function Section({ id, label, list, onAdd }) {
    const isCollapsed = collapsed[id];
    if (list.length === 0 && !onAdd) return null;
    return (
      <div className="mt-4 first:mt-2">
        <div className="group/sec px-1.5 flex items-center justify-between cursor-pointer select-none"
             onClick={() => setCollapsed((c) => ({ ...c, [id]: !c[id] }))}>
          <div className="flex items-center gap-0.5 text-tiny uppercase font-bold tracking-wide text-app-header-secondary hover:text-app-interactive-active row-hover">
            <ChevronDownIcon
              size={12}
              className={'transition-transform duration-150 ' + (isCollapsed ? '-rotate-90' : '')}
            />
            <span>{label}</span>
          </div>
          {onAdd && (
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              className="opacity-0 group-hover/sec:opacity-100 text-app-header-secondary hover:text-app-interactive-active transition-opacity press-feedback"
              title="Create channel"
            >
              <PlusIcon size={16} />
            </button>
          )}
        </div>
        {!isCollapsed && (
          <div className="mt-[2px] space-y-[2px]">
            {list.map((c) => <ChannelButton key={c.id} c={c} />)}
          </div>
        )}
      </div>
    );
  }

  function CategoryGroup({ cat, list }) {
    return (
      <Section
        id={`cat-${cat.id}`}
        label={cat.name}
        list={list}
        onAdd={isServerAdmin ? () => { setType('text'); setShowCreate(true); } : null}
      />
    );
  }

  return (
    <aside className="w-60 bg-app-900 flex flex-col shrink-0 h-full">
      {/* Server header */}
      <header className="h-12 px-4 flex items-center justify-between border-b border-black/30 shadow-channel-header shrink-0">
        <h2 className="font-semibold text-app-header truncate text-[16px] tracking-tight">
          {server?.name || 'Select a server'}
        </h2>
        {server && (
          <div className="flex items-center gap-0.5">
            {isServerAdmin && (
              <button
                onClick={() => setServerSettingsOpen(true)}
                className="text-app-interactive hover:text-app-interactive-active row-hover p-1 ring-focus rounded"
                title="Server settings"
                aria-label="Server settings"
              >
                <CogIcon size={18} />
              </button>
            )}
            <button
              onClick={copyInvite}
              className="text-app-interactive hover:text-app-interactive-active row-hover p-1 -mr-1 ring-focus rounded"
              title="Copy invite code"
              aria-label="Copy invite code"
            >
              <ChevronDownIcon size={18} />
            </button>
          </div>
        )}
      </header>

      {/* Channels list */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-0.5">
        {!server && (
          <div className="px-2 py-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-app-700/50 flex items-center justify-center text-app-channel mb-3">
              <HashIcon size={22} />
            </div>
            <div className="text-sm text-app-header-secondary">No server selected</div>
            <div className="text-tiny text-app-muted mt-1">Pick a server on the left or add one to start chatting.</div>
          </div>
        )}

        {server && (
          <button
            onClick={() => setEventsOpen(true)}
            className="w-full flex items-center gap-2 px-2 py-2 mb-1 rounded text-sm font-medium text-app-interactive hover:bg-app-700/60 hover:text-app-interactive-active row-hover press-feedback"
          >
            <CalendarIcon size={18} />
            Events
          </button>
        )}

        {server && channels.length === 0 && (
          <>
            <div className="px-2 mt-2 text-tiny uppercase tracking-wide font-bold text-app-header-secondary">Loading…</div>
            <ChannelSkeletons count={3} />
          </>
        )}

        {server && channels.length > 0 && (
          <>
            {/* Uncategorized: keep grouped by type so voice/video stay separate */}
            <Section id="u-text"  label="Text Channels"  list={byType(uncategorized, 'text').concat(byType(uncategorized, 'announcement'))}
                     onAdd={isServerAdmin ? () => { setType('text'); setShowCreate(true); } : null} />
            <Section id="u-voice" label="Voice Channels" list={byType(uncategorized, 'voice').concat(byType(uncategorized, 'stage'))}
                     onAdd={isServerAdmin ? () => { setType('voice'); setShowCreate(true); } : null} />
            <Section id="u-video" label="Video Channels" list={byType(uncategorized, 'video')}
                     onAdd={isServerAdmin ? () => { setType('video'); setShowCreate(true); } : null} />
            <Section id="u-forum" label="Forums"         list={byType(uncategorized, 'forum')}
                     onAdd={isServerAdmin ? () => { setType('forum'); setShowCreate(true); } : null} />

            {/* Categories */}
            {orderedCategories.map((cat) => (
              <CategoryGroup key={cat.id} cat={cat} list={channels.filter((c) => c.category_id === cat.id)} />
            ))}

            {isServerAdmin && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full flex items-center justify-center gap-1 text-tiny text-app-header-secondary hover:text-app-interactive-active px-2 py-2 rounded hover:bg-app-700/60 row-hover press-feedback"
                >
                  <PlusIcon size={14} /> Channel
                </button>
                <button
                  onClick={() => setCreateCategoryOpen(true)}
                  className="w-full flex items-center justify-center gap-1 text-tiny text-app-header-secondary hover:text-app-interactive-active px-2 py-2 rounded hover:bg-app-700/60 row-hover press-feedback"
                >
                  <PlusIcon size={14} /> Category
                </button>
              </div>
            )}

            <button
              onClick={copyInvite}
              className="mt-3 w-full text-left px-3 py-2 rounded bg-black/20 hover:bg-black/30 row-hover group/inv"
            >
              <div className="text-tiny uppercase font-bold text-app-header-secondary tracking-wide">Invite</div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <code className="font-mono text-xs text-app-link select-all truncate">{server.invite_code}</code>
                <span className="text-tiny text-app-muted group-hover/inv:text-app-interactive-active">Copy</span>
              </div>
            </button>
          </>
        )}
      </nav>

      {/* User bar */}
      <div className="h-[52px] px-2 bg-app-950 border-t border-app-divider flex items-center justify-between gap-0.5 shrink-0">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 min-w-0 px-1 py-1 rounded hover:bg-app-700/60 row-hover flex-1 press-feedback"
          title="My Account"
        >
          <div className="relative shrink-0">
            <Avatar name={user?.display_name || user?.username} src={user?.avatar_url} size={32} status="online" />
          </div>
          <div className="min-w-0 leading-tight text-left">
            <div className="text-sm font-semibold text-app-interactive-active truncate flex items-center">
              {user?.display_name || user?.username}
              {user?.is_bot && <BotBadge size="sm" />}
            </div>
            <div className="text-tiny text-app-header-secondary truncate">@{user?.username}</div>
          </div>
        </button>
        <div className="flex items-center">
          <button
            className="p-2 text-app-interactive hover:text-app-interactive-active hover:bg-app-700/60 row-hover rounded press-feedback ring-focus"
            title="Mute (visual only)"
            aria-label="Mute"
          >
            <MicIcon size={18} />
          </button>
          <button
            className="p-2 text-app-interactive hover:text-app-interactive-active hover:bg-app-700/60 row-hover rounded press-feedback ring-focus"
            title="Deafen (visual only)"
            aria-label="Deafen"
          >
            <HeadphoneIcon size={18} />
          </button>
          {user?.is_admin && (
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
            aria-label="User Settings"
          >
            <CogIcon size={18} />
          </button>
        </div>
      </div>

      {/* Create channel modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-app-800 rounded-md w-full max-w-md shadow-elevation overflow-hidden animate-modal-in">
            <div className="px-6 pt-6 pb-2 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-app-header">Create Channel</h3>
                <p className="text-sm text-app-header-secondary mt-1">in {server?.name}</p>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="text-app-interactive hover:text-app-interactive-active p-1 -mr-2 -mt-1 press-feedback ring-focus rounded"
              >
                <CloseIcon size={22} />
              </button>
            </div>

            <form onSubmit={submitCreate} className="px-6 py-6 space-y-5">
              <div>
                <label className="text-eyebrow uppercase font-bold text-app-header-secondary">Channel Type</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[
                    { v: 'text',         label: 'Text',         Icon: HashIcon,      desc: 'Send messages' },
                    { v: 'voice',        label: 'Voice',        Icon: SpeakerIcon,   desc: 'Talk together' },
                    { v: 'video',        label: 'Video',        Icon: VideoIcon,     desc: 'See each other' },
                    { v: 'announcement', label: 'Announcement', Icon: BellNotifIcon, desc: 'Admin posts only' },
                    { v: 'forum',        label: 'Forum',        Icon: ChatBubbleIcon,desc: 'Threaded posts' },
                    { v: 'stage',        label: 'Stage',        Icon: StarIcon,      desc: 'Speakers + audience' },
                  ].map(({ v, label, Icon, desc }) => (
                    <button
                      type="button"
                      key={v}
                      onClick={() => setType(v)}
                      className={classNames(
                        'flex flex-col items-center gap-1 py-3 rounded border transition-colors press-feedback',
                        type === v
                          ? 'border-app-500 bg-app-500/15 text-app-interactive-active'
                          : 'border-app-divider bg-app-950 text-app-interactive hover:text-app-interactive-active hover:border-app-channel'
                      )}
                    >
                      <Icon size={22} />
                      <span className="text-xs font-medium">{label}</span>
                      <span className="text-tiny text-app-muted px-1 leading-tight">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-eyebrow uppercase font-bold text-app-header-secondary">Channel Name</label>
                <div className="relative mt-1.5">
                  <ChannelIcon type={type} size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
                  <input
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    className="w-full bg-app-950 outline-none rounded pl-9 pr-3 py-2.5 text-app-interactive-active focus:ring-2 focus:ring-app-500"
                    placeholder="new-channel"
                  />
                </div>
              </div>
            </form>

            <div className="bg-app-850 px-6 py-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-app-interactive-active text-sm hover:underline press-feedback">Cancel</button>
              <button
                onClick={submitCreate}
                disabled={submitting || !name.trim()}
                className="px-5 py-2 bg-app-500 hover:bg-app-400 disabled:opacity-60 text-white text-sm font-medium rounded press-feedback transition-colors"
              >
                {submitting ? 'Creating…' : 'Create Channel'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast show={toast} kind="success">Invite copied to clipboard</Toast>

      {eventsOpen && server && (
        <EventsModal
          serverId={server.id}
          serverName={server.name}
          channels={channels}
          isAdmin={isServerAdmin}
          onClose={() => setEventsOpen(false)}
        />
      )}

      {serverSettingsOpen && server && (
        <ServerSettingsModal server={server} onClose={() => setServerSettingsOpen(false)} />
      )}

      {createCategoryOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-app-800 rounded-md w-full max-w-md shadow-elevation overflow-hidden animate-modal-in">
            <div className="px-6 pt-6 pb-2 flex items-start justify-between">
              <h3 className="text-xl font-bold text-app-header">Create category</h3>
              <button
                onClick={() => setCreateCategoryOpen(false)}
                className="text-app-interactive hover:text-app-interactive-active p-1 -mr-2 -mt-1 press-feedback ring-focus rounded"
              ><CloseIcon size={22} /></button>
            </div>
            <div className="px-6 py-4">
              <label className="text-eyebrow uppercase font-bold text-app-header-secondary">Name</label>
              <input
                autoFocus
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="New category"
                className="mt-1.5 w-full bg-app-950 outline-none rounded px-3 py-2.5 text-app-interactive-active focus:ring-2 focus:ring-app-500"
              />
            </div>
            <div className="bg-app-secondary-alt px-6 py-4 flex justify-end gap-2">
              <button type="button" onClick={() => setCreateCategoryOpen(false)} className="px-4 py-2 text-app-interactive-active text-sm hover:underline press-feedback">Cancel</button>
              <button
                onClick={createCategory}
                disabled={!categoryName.trim()}
                className="px-5 py-2 bg-app-500 hover:bg-app-400 disabled:opacity-60 text-white text-sm font-medium rounded press-feedback"
              >Create</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
