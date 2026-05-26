import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/chat';
import { useAuthStore } from '../store/auth';
import { useUIStore } from '../store/ui';
import { useBrandingStore } from '../store/branding';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import { MessageSkeletons } from './Skeleton';
import UserProfilePopover from './UserProfilePopover';
import Avatar from './Avatar';
import api from '../services/api';
import {
  MenuIcon, UsersIcon, CloseIcon, AtSignIcon,
} from './icons';

function dayKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
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

function DMWelcome({ conv, me }) {
  const others = (conv.others || []).filter((o) => o.id !== me?.id);
  const isGroup = conv.is_group;
  const headline = isGroup
    ? (conv.name || others.map((o) => o.display_name || o.username).join(', ') || 'Group chat')
    : (others[0]?.display_name || others[0]?.username || 'Someone');
  return (
    <div className="px-4 sm:px-6 pt-8 pb-4">
      {isGroup ? (
        <div className="w-[72px] h-[72px] rounded-full bg-app-700 flex items-center justify-center text-app-interactive">
          <UsersIcon size={36} />
        </div>
      ) : (
        <Avatar name={headline} src={others[0]?.avatar_url} size={72} />
      )}
      <h2 className="text-[28px] sm:text-[32px] font-extrabold text-app-header mt-3 tracking-tight">{headline}</h2>
      <p className="text-app-header-secondary mt-1 text-message">
        {isGroup
          ? `Welcome to the beginning of this group chat with ${others.length + 1} people.`
          : `This is the beginning of your direct message history with ${headline}.`}
      </p>
      <hr className="mt-6 border-app-divider/60" />
    </div>
  );
}

function Header({ conv, me, onLeave }) {
  const { toggleLeft } = useUIStore();
  const isGroup = conv.is_group;
  const others = (conv.others || []).filter((o) => o.id !== me?.id);
  const label = isGroup
    ? (conv.name || others.map((o) => o.display_name || o.username).join(', ') || 'Group')
    : (others[0]?.display_name || others[0]?.username || 'Direct message');

  return (
    <div className="h-12 px-2 sm:px-4 flex items-center gap-2 shadow-channel-header shrink-0 bg-app-800 z-10">
      <button
        onClick={toggleLeft}
        className="md:hidden p-2 -ml-1 text-app-interactive hover:text-app-interactive-active row-hover rounded press-feedback"
        aria-label="Open conversations"
      >
        <MenuIcon size={22} />
      </button>
      <span className="text-app-channel">
        <AtSignIcon size={20} />
      </span>
      <h3 className="font-semibold text-app-header truncate text-[16px] tracking-tight">{label}</h3>
      <div className="flex-1" />
      <button
        onClick={onLeave}
        title={isGroup ? 'Leave group' : 'Close DM'}
        className="p-1.5 rounded text-app-interactive hover:text-app-red row-hover press-feedback"
      >
        <CloseIcon size={18} />
      </button>
    </div>
  );
}

export default function DMArea() {
  const me = useAuthStore((s) => s.user);
  const brand = useBrandingStore();
  const {
    dmConversations, currentConversationId, dmMessages,
    loadingMessages, typing, selectConversation, loadDMs,
  } = useChatStore();
  const scrollerRef = useRef(null);
  const [profileFor, setProfileFor] = useState(null);

  const conv = (dmConversations || []).find((c) => c.id === currentConversationId);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [dmMessages.length, currentConversationId]);

  if (!conv) {
    return (
      <main className="flex-1 flex flex-col bg-app-800 min-w-0">
        <div className="h-12 px-3 flex items-center shadow-channel-header bg-app-800">
          <div className="text-sm font-semibold text-app-header">Direct Messages</div>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 overflow-y-auto">
          <div className="text-center max-w-md py-10">
            <div className="w-24 h-24 mx-auto rounded-full bg-app-700/40 text-app-interactive flex items-center justify-center">
              <AtSignIcon size={42} />
            </div>
            <h2 className="text-2xl sm:text-3xl text-app-header font-extrabold mt-6 tracking-tight">
              Your messages live here
            </h2>
            <p className="text-app-header-secondary mt-2 text-balance">
              Start a one-on-one chat or pull a few people into a group. Conversations stay private to whoever you invite.
            </p>
          </div>
        </div>
      </main>
    );
  }

  async function leave() {
    if (!window.confirm(conv.is_group ? 'Leave this group?' : 'Close this conversation?')) return;
    try {
      await api.delete(`/dms/${conv.id}/leave`);
      await selectConversation(null);
      await loadDMs();
    } catch (_) { /* swallow */ }
  }

  const typingForConv = Object.values(typing[currentConversationId] || {});

  const rendered = [];
  for (let i = 0; i < dmMessages.length; i++) {
    const m = dmMessages[i];
    const prev = dmMessages[i - 1];
    const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
    const compact = !!prev && !newDay &&
      prev.user_id === m.user_id &&
      (new Date(m.created_at) - new Date(prev.created_at)) < 7 * 60 * 1000;
    if (newDay) rendered.push({ kind: 'date', key: 'd-' + dayKey(m.created_at), label: dayLabel(m.created_at) });
    rendered.push({ kind: 'msg', key: m.id, message: m, compact });
  }

  return (
    <main className="relative flex-1 flex flex-col bg-app-800 min-w-0">
      <Header conv={conv} me={me} onLeave={leave} />

      <div ref={scrollerRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {loadingMessages && <MessageSkeletons count={5} />}
        {!loadingMessages && dmMessages.length === 0 && <DMWelcome conv={conv} me={me} />}
        {!loadingMessages && dmMessages.length > 0 && (
          <div className="pt-4 pb-2">
            {rendered.map((r) =>
              r.kind === 'date'
                ? <DateDivider key={r.key} label={r.label} />
                : <div key={r.key} className="animate-msg-in">
                    <MessageItem
                      message={r.message}
                      compact={r.compact}
                      onUserClick={({ user_id, anchor }) => setProfileFor({ user_id, anchor })}
                      canModerate={false}
                    />
                  </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 h-6 text-tiny text-app-header-secondary flex items-center">
        {typingForConv.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-app-interactive animate-bounce-dot" />
              <span className="w-1 h-1 rounded-full bg-app-interactive animate-bounce-dot" style={{ animationDelay: '160ms' }} />
              <span className="w-1 h-1 rounded-full bg-app-interactive animate-bounce-dot" style={{ animationDelay: '320ms' }} />
            </span>
            <span>
              <span className="font-semibold text-app-interactive-active">{typingForConv.join(', ')}</span>
              {' '}{typingForConv.length === 1 ? 'is typing' : 'are typing'}…
            </span>
          </span>
        )}
      </div>

      <MessageInput
        conversationId={currentConversationId}
        placeholder={`Message ${conv.is_group
          ? (conv.name || 'group')
          : '@' + ((conv.others?.[0]?.username) || 'them')}`}
      />

      {profileFor && (
        <UserProfilePopover
          user_id={profileFor.user_id}
          anchor={profileFor.anchor}
          onClose={() => setProfileFor(null)}
        />
      )}
    </main>
  );
}
