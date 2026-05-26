import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Avatar from './Avatar';
import { BotBadge, AdminBadge } from './Badge';
import { CloseIcon, AddMemberIcon, MoreHIcon, EditIcon, SendIcon } from './icons';
import { useAuthStore } from '../store/auth';
import { useChatStore } from '../store/chat';

// Positioned popover anchored relative to viewport (click outside to close).
export default function UserProfilePopover({ anchor, user_id, onClose }) {
  const me = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [mutual, setMutual] = useState([]);
  const [err, setErr] = useState(null);
  const ref = useRef(null);

  const isMe = me?.id === user_id;

  useEffect(() => {
    let alive = true;
    api.get(`/users/${user_id}`)
      .then((r) => { if (!alive) return; setUser(r.data.user); setMutual(r.data.mutual_servers || []); })
      .catch((e) => alive && setErr(e?.response?.data?.error || e.message));
    return () => { alive = false; };
  }, [user_id]);

  // Click outside closes
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

  // Compute position — try right of the anchor first, flip left if no room,
  // otherwise center horizontally. Always clamp to viewport.
  const rect = anchor?.getBoundingClientRect?.();
  const POP_W = 340;
  const POP_H = 420;
  const margin = 12;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;

  let left, top;
  if (rect) {
    const rightRoom = vw - rect.right - margin;
    const leftRoom = rect.left - margin;
    if (rightRoom >= POP_W) {
      left = rect.right + 8;
    } else if (leftRoom >= POP_W) {
      left = rect.left - POP_W - 8;
    } else {
      // Not enough room either side — center horizontally
      left = Math.max(margin, Math.min(vw - POP_W - margin, rect.left + rect.width / 2 - POP_W / 2));
    }
    // Vertical: try to align top of popover ~40px above anchor, clamp.
    const wantTop = rect.top - 40;
    top = Math.max(margin, Math.min(vh - POP_H - margin, wantTop));
  } else {
    left = Math.max(margin, vw / 2 - POP_W / 2);
    top = Math.max(margin, vh / 2 - POP_H / 2);
  }

  return (
    <div
      ref={ref}
      style={{ top, left, width: POP_W }}
      className="fixed z-[80] bg-app-floating rounded-lg shadow-elevation-high overflow-hidden animate-modal-in"
    >
      {/* Banner */}
      <div
        className="h-[60px] relative"
        style={{ backgroundColor: (user?.banner_color) || 'rgb(var(--app-brand))' }}
      >
        <div className="absolute top-2 right-2 flex gap-1">
          {!isMe && (
            <button
              className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center press-feedback"
              title="Add Friend"
              aria-label="Add Friend"
            >
              <AddMemberIcon size={14} />
            </button>
          )}
          <button
            className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center press-feedback"
            title="More"
            aria-label="More"
          >
            <MoreHIcon size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-4 -mt-[44px]">
        <div className="rounded-full ring-[6px] ring-app-floating inline-block">
          <Avatar
            name={(user?.display_name || user?.username) || '?'}
            src={user?.avatar_url}
            size={80}
            status={user?.status || 'online'}
          />
        </div>

        {err && <div className="mt-3 text-app-red text-sm">{err}</div>}

        {user && (
          <>
            <div className="mt-3">
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold text-app-header truncate">
                  {user.display_name || user.username}
                </span>
                {user.is_bot && <BotBadge size="md" />}
                {user.is_admin && <AdminBadge />}
              </div>
              <div className="text-tiny text-app-header-secondary">@{user.username}</div>
              {user.pronouns && (
                <div className="text-tiny text-app-header-secondary mt-0.5">{user.pronouns}</div>
              )}
            </div>

            <div className="mt-3 bg-app-secondary-alt rounded-md p-3">
              {user.bio && (
                <>
                  <div className="text-tiny uppercase font-bold tracking-wide text-app-header-secondary">About Me</div>
                  <div className="text-sm text-app-text mt-1 whitespace-pre-wrap break-words">{user.bio}</div>
                </>
              )}
              {!user.bio && (
                <div className="text-tiny text-app-header-secondary italic">
                  This user hasn't filled out their bio yet.
                </div>
              )}
              <div className="mt-2 text-tiny text-app-header-secondary">
                Member since {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
              </div>
            </div>

            {!isMe && mutual.length > 0 && (
              <div className="mt-3 px-3 py-2 bg-app-secondary-alt rounded-md">
                <div className="text-tiny font-bold text-app-header-secondary flex items-center gap-1">
                  <span className="w-4 h-4 inline-flex items-center justify-center rounded bg-app-700 text-app-link text-[10px] font-extrabold">
                    {(mutual[0].name || 'S').slice(0, 1).toUpperCase()}
                  </span>
                  {mutual.length} Mutual Server{mutual.length === 1 ? '' : 's'}
                </div>
              </div>
            )}

            {isMe ? (
              <button
                onClick={() => { onClose(); navigate('/settings?s=profile'); }}
                className="mt-3 w-full bg-app-500 hover:bg-app-400 text-white font-medium py-2 rounded flex items-center justify-center gap-2 press-feedback"
              >
                <EditIcon size={16} />
                Edit Profile
              </button>
            ) : (
              <button
                onClick={async () => {
                  try {
                    await useChatStore.getState().openDMWith(user.id);
                    onClose();
                    navigate('/');
                  } catch (_) { /* swallow */ }
                }}
                className="mt-3 w-full bg-app-500 hover:bg-app-400 text-white font-medium py-2 rounded flex items-center justify-center gap-2 press-feedback"
              >
                <SendIcon size={16} />
                Message @{user.username}
              </button>
            )}
          </>
        )}
        {!user && !err && (
          <div className="mt-12 text-center text-app-header-secondary text-sm">Loading…</div>
        )}
      </div>
    </div>
  );
}
