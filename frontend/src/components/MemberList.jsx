import { useState } from 'react';
import Avatar from './Avatar';
import { useChatStore } from '../store/chat';
import { useUIStore } from '../store/ui';
import { CloseIcon, CrownIcon } from './icons';
import { BotBadge } from './Badge';
import UserProfilePopover from './UserProfilePopover';

export default function MemberList() {
  const { members, presence } = useChatStore();
  const { closeAll } = useUIStore();
  const [profileFor, setProfileFor] = useState(null);

  const decorated = members.map((m) => ({
    ...m,
    effectiveStatus: presence[m.id] || m.status || 'offline',
  }));
  const online = decorated.filter((m) => m.effectiveStatus === 'online');
  const offline = decorated.filter((m) => m.effectiveStatus !== 'online');

  function Row({ m }) {
    const offlineState = m.effectiveStatus !== 'online';
    return (
      <button
        type="button"
        onClick={(e) => setProfileFor({ user_id: m.id, anchor: e.currentTarget })}
        className="w-full text-left flex items-center gap-2 mx-2 px-2 py-1.5 rounded row-hover hover:bg-[rgba(78,80,88,0.4)] cursor-pointer group/member press-feedback"
      >
        <div className={offlineState ? 'opacity-60' : ''}>
          <Avatar name={m.username} src={m.avatar_url} size={32} status={m.effectiveStatus} />
        </div>
        <div className="min-w-0 flex-1 flex items-center gap-1">
          <span
            className={
              'text-sm font-medium truncate ' +
              (offlineState ? 'text-app-channel' : 'text-app-interactive-hover group-hover/member:text-app-interactive-active')
            }
          >
            {m.display_name || m.username}
          </span>
          {m.is_bot && <BotBadge size="sm" />}
          {m.role === 'owner' && (
            <CrownIcon size={14} className="text-app-yellow shrink-0" />
          )}
        </div>
      </button>
    );
  }

  function Section({ label, list }) {
    if (list.length === 0) return null;
    return (
      <div className="mt-4 first:mt-3">
        <div className="px-4 mb-1 text-tiny uppercase tracking-wide font-bold text-app-header-secondary">
          {label} — {list.length}
        </div>
        <div>{list.map((m) => <Row key={m.id} m={m} />)}</div>
      </div>
    );
  }

  return (
    <aside className="w-60 bg-app-900 shrink-0 overflow-hidden h-full flex flex-col">
      <div className="lg:hidden flex items-center justify-between px-4 h-12 shadow-channel-header shrink-0">
        <h3 className="text-sm font-semibold text-app-header">Members</h3>
        <button onClick={closeAll} className="text-app-interactive hover:text-app-interactive-active p-2 -mr-2 press-feedback ring-focus rounded">
          <CloseIcon size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin pb-4">
        <Section label="Online" list={online} />
        <Section label="Offline" list={offline} />
        {members.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-app-header-secondary">
            No members yet.
          </div>
        )}
      </div>
      {profileFor && (
        <UserProfilePopover
          user_id={profileFor.user_id}
          anchor={profileFor.anchor}
          onClose={() => setProfileFor(null)}
        />
      )}
    </aside>
  );
}
