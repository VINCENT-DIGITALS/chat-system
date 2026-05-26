import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/chat';
import { useUIStore } from '../store/ui';
import { useBrandingStore } from '../store/branding';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import VoiceRoomPanel from './VoiceRoomPanel';
import VideoRoomPanel from './VideoRoomPanel';
import { MessageSkeletons } from './Skeleton';
import PollCreateModal from './PollCreateModal';
import ThreadCreateModal from './ThreadCreateModal';
import EventsModal from './EventsModal';
import UserProfilePopover from './UserProfilePopover';
import InboxPopover from './InboxPopover';
import SearchPopover from './SearchPopover';
import {
  HashIcon, SpeakerIcon, VideoIcon, MenuIcon, UsersIcon,
  PlusIcon, CompassIcon, InboxStackIcon, BellNotifIcon, PinIcon,
  ThreadIcon, SearchIcon,
} from './icons';

function ChannelTypeIcon({ type, size = 24, className = '' }) {
  const c = 'text-app-channel ' + className;
  if (type === 'voice') return <SpeakerIcon size={size} className={c} />;
  if (type === 'video') return <VideoIcon size={size} className={c} />;
  return <HashIcon size={size} className={c} />;
}

function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function dayLabel(ts) {
  const d = new Date(ts);
  const today = new Date(); today.setHours(0,0,0,0);
  const that = new Date(d); that.setHours(0,0,0,0);
  const diff = Math.round((today - that) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
function DateDivider({ label }) {
  return (
    <div className="flex items-center px-4 my-2 select-none">
      <div className="flex-1 h-px bg-app-divider/70" />
      <div className="mx-2 px-2 py-0.5 text-tiny font-semibold text-app-header-secondary bg-app-800">{label}</div>
      <div className="flex-1 h-px bg-app-divider/70" />
    </div>
  );
}

function Header({ channel, onOpenInbox, onOpenSearch, brand, brandName }) {
  const { toggleLeft, toggleRight } = useUIStore();
  return (
    <div className="h-12 px-2 sm:px-4 flex items-center gap-2 shadow-channel-header shrink-0 bg-app-800 z-10">
      <button
        onClick={toggleLeft}
        className="md:hidden p-2 -ml-1 text-app-interactive hover:text-app-interactive-active row-hover rounded press-feedback"
        aria-label="Open channels"
      >
        <MenuIcon size={22} />
      </button>
      <ChannelTypeIcon type={channel.type} />
      <h3 className="font-semibold text-app-header truncate text-[16px] tracking-tight">
        {channel.name}
      </h3>

      <div className="flex-1" />

      {/* Right-side toolbar — exact Discord */}
      <div className="hidden md:flex items-center gap-1 mr-2">
        <IconBtn label="Threads"><ThreadIcon size={20} /></IconBtn>
        <IconBtn label="Inbox" onClick={onOpenInbox}><InboxStackIcon size={20} /></IconBtn>
        <IconBtn label="Pinned Messages"><PinIcon size={20} /></IconBtn>
        <IconBtn label="Show Member List" onClick={toggleRight} className="lg:hidden"><UsersIcon size={20} /></IconBtn>
      </div>

      {/* Search box */}
      <div className="hidden lg:block relative">
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-2 py-1 rounded bg-app-900 text-app-header-secondary hover:text-app-interactive-active w-[160px] text-sm"
        >
          <span className="flex-1 text-left truncate">Search {brand?.app_name || brandName || ''}</span>
          <SearchIcon size={14} />
        </button>
      </div>

      <button
        onClick={toggleRight}
        className="lg:hidden p-2 -mr-1 text-app-interactive hover:text-app-interactive-active row-hover rounded press-feedback"
        aria-label="Show members"
      >
        <UsersIcon size={20} />
      </button>
    </div>
  );
}

function IconBtn({ children, label, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={'p-1.5 rounded text-app-interactive hover:text-app-interactive-active row-hover press-feedback ' + className}
    >
      {children}
    </button>
  );
}

function NoServerWelcome() {
  const { toggleLeft } = useUIStore();
  const brand = useBrandingStore();
  return (
    <main className="flex-1 flex flex-col bg-app-800 min-w-0">
      <div className="h-12 px-2 flex items-center md:hidden shadow-channel-header bg-app-800">
        <button onClick={toggleLeft} className="p-2 text-app-interactive hover:text-app-interactive-active row-hover rounded press-feedback" aria-label="Open menu">
          <MenuIcon size={22} />
        </button>
        <div className="ml-1 text-sm font-semibold text-app-header">{brand.app_name}</div>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 overflow-y-auto">
        <div className="text-center max-w-md py-10">
          <div className="relative w-28 h-28 mx-auto">
            <div className="absolute inset-0 rounded-full bg-app-500/15 animate-pulse-soft" />
            <div className="absolute inset-3 rounded-full bg-app-500/30" />
            <div className="absolute inset-6 rounded-full bg-app-500 text-white flex items-center justify-center text-2xl font-extrabold tracking-wider">
              {brand.app_short || 'CS'}
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl text-app-header font-extrabold mt-6 tracking-tight">Welcome to {brand.app_name}</h2>
          <p className="text-app-header-secondary mt-2 text-balance">Servers are where you and your friends hang out. Create one to start the conversation, or join one with an invite.</p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            <div className="bg-app-900 rounded-lg p-4 ring-1 ring-black/20">
              <div className="w-10 h-10 rounded-full bg-app-green/20 text-app-green flex items-center justify-center"><PlusIcon size={20} /></div>
              <div className="text-sm font-semibold text-app-header mt-3">Create a server</div>
              <p className="text-tiny text-app-header-secondary mt-1">Spin up your own space. We'll add a <code className="font-mono">#general</code> channel for you.</p>
            </div>
            <div className="bg-app-900 rounded-lg p-4 ring-1 ring-black/20">
              <div className="w-10 h-10 rounded-full bg-app-500/20 text-app-500 flex items-center justify-center"><CompassIcon size={20} /></div>
              <div className="text-sm font-semibold text-app-header mt-3">Join with invite</div>
              <p className="text-tiny text-app-header-secondary mt-1">Got a code from a friend? Pop it in and join the party in seconds.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function ChannelWelcome({ channel }) {
  return (
    <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-2">
      <div className="w-[68px] h-[68px] rounded-full bg-app-500/15 text-app-500 flex items-center justify-center">
        <HashIcon size={36} />
      </div>
      <h2 className="text-[28px] sm:text-[32px] font-extrabold text-app-header mt-3 tracking-tight">Welcome to #{channel.name}!</h2>
      <p className="text-app-header-secondary mt-1 text-message">
        This is the start of the <span className="text-app-interactive-active font-medium">#{channel.name}</span> channel. Send a message to start the conversation.
      </p>
      <hr className="mt-6 border-app-divider/60" />
    </div>
  );
}

export default function ChatArea() {
  const { servers, channels, currentServerId, currentChannelId, messages, loadingMessages, typing } = useChatStore();
  const channel = channels.find((c) => c.id === currentChannelId);
  const brand = useBrandingStore();
  const scrollerRef = useRef(null);
  const [pollOpen, setPollOpen] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileFor, setProfileFor] = useState(null); // { user_id, anchor }

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, currentChannelId]);

  if (!currentServerId || servers.length === 0) return <NoServerWelcome />;
  if (!channel) {
    return (
      <main className="flex-1 flex flex-col bg-app-800 min-w-0">
        <div className="h-12 px-3 flex items-center shadow-channel-header bg-app-800">
          <div className="text-sm font-semibold text-app-header">No channel selected</div>
        </div>
        <div className="flex-1 flex items-center justify-center text-app-header-secondary text-sm">Pick a channel from the sidebar.</div>
      </main>
    );
  }

  if (channel.type === 'voice') {
    return (
      <main className="flex-1 flex flex-col bg-app-800 min-w-0">
        <Header channel={channel} brand={brand} onOpenInbox={() => setInboxOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
        <VoiceRoomPanel channel={channel} />
        {inboxOpen && <InboxPopoverWrap onClose={() => setInboxOpen(false)} />}
        {searchOpen && <SearchPopoverWrap onClose={() => setSearchOpen(false)} placeholder="Search" />}
      </main>
    );
  }
  if (channel.type === 'video') {
    return (
      <main className="flex-1 flex flex-col bg-app-800 min-w-0">
        <Header channel={channel} brand={brand} onOpenInbox={() => setInboxOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
        <VideoRoomPanel channel={channel} />
        {inboxOpen && <InboxPopoverWrap onClose={() => setInboxOpen(false)} />}
        {searchOpen && <SearchPopoverWrap onClose={() => setSearchOpen(false)} placeholder="Search" />}
      </main>
    );
  }

  const typingForChannel = Object.values(typing[currentChannelId] || {});

  const rendered = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const prev = messages[i - 1];
    const isSystem = !!(m.type && m.type.startsWith('system_'));
    const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
    const compact = !isSystem && !!prev && !newDay &&
      prev.user_id === m.user_id &&
      prev.type === m.type &&
      (new Date(m.created_at) - new Date(prev.created_at)) < 7 * 60 * 1000;
    if (newDay) rendered.push({ kind: 'date', key: 'd-' + dayKey(m.created_at), label: dayLabel(m.created_at) });
    rendered.push({ kind: 'msg', key: m.id, message: m, compact });
  }

  return (
    <main className="relative flex-1 flex flex-col bg-app-800 min-w-0">
      <Header
        channel={channel}
        brand={brand}
        onOpenInbox={() => setInboxOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <div ref={scrollerRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {loadingMessages && <MessageSkeletons count={6} />}
        {!loadingMessages && messages.length === 0 && <ChannelWelcome channel={channel} />}
        {!loadingMessages && messages.length > 0 && (
          <div className="pt-4 pb-2">
            {rendered.map((r) =>
              r.kind === 'date'
                ? <DateDivider key={r.key} label={r.label} />
                : <div key={r.key} className="animate-msg-in">
                    <MessageItem message={r.message} compact={r.compact} onUserClick={({ user_id, anchor }) => setProfileFor({ user_id, anchor })} />
                  </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 h-6 text-tiny text-app-header-secondary flex items-center">
        {typingForChannel.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-app-interactive animate-bounce-dot" />
              <span className="w-1 h-1 rounded-full bg-app-interactive animate-bounce-dot" style={{ animationDelay: '160ms' }} />
              <span className="w-1 h-1 rounded-full bg-app-interactive animate-bounce-dot" style={{ animationDelay: '320ms' }} />
            </span>
            <span><span className="font-semibold text-app-interactive-active">{typingForChannel.join(', ')}</span> {typingForChannel.length === 1 ? 'is typing' : 'are typing'}…</span>
          </span>
        )}
      </div>

      <MessageInput
        channelId={currentChannelId}
        placeholder={`Message #${channel.name}`}
        onCreatePoll={() => setPollOpen(true)}
        onCreateThread={() => setThreadOpen(true)}
      />

      {pollOpen && <PollCreateModal channelId={currentChannelId} channelName={channel.name} onClose={() => setPollOpen(false)} />}
      {threadOpen && <ThreadCreateModal channelId={currentChannelId} channelName={channel.name} onClose={() => setThreadOpen(false)} />}
      {profileFor && <UserProfilePopover user_id={profileFor.user_id} anchor={profileFor.anchor} onClose={() => setProfileFor(null)} />}
      {inboxOpen && <InboxPopoverWrap onClose={() => setInboxOpen(false)} />}
      {searchOpen && <SearchPopoverWrap onClose={() => setSearchOpen(false)} placeholder={`Search ${brand.app_name}`} />}
    </main>
  );
}

function InboxPopoverWrap({ onClose }) {
  return (
    <div className="absolute top-12 right-4 z-[55]">
      <InboxPopover onClose={onClose} />
    </div>
  );
}

function SearchPopoverWrap({ onClose, placeholder }) {
  return (
    <div className="absolute top-12 right-4 z-[55]">
      <SearchPopover onClose={onClose} placeholder={placeholder} />
    </div>
  );
}
