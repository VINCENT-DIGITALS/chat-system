import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import { BotBadge } from './Badge';
import {
  UploadIcon, ReplyIcon, EditIcon, TrashIcon, EmojiIcon, PinIcon,
} from './icons';
import Poll from './Poll';
import SystemMessage from './SystemMessage';
import api from '../services/api';
import { useChatStore } from '../store/chat';
import { useAuthStore } from '../store/auth';

// Original built-in quick-react set (no Discord-default reactions).
const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥', '😮', '😢', '🙏'];

function timeOnly(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fullStamp(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const today = new Date(); today.setHours(0,0,0,0);
  const that = new Date(d); that.setHours(0,0,0,0);
  const diff = Math.round((today - that) / 86400000);
  const t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff === 0) return `Today at ${t}`;
  if (diff === 1) return `Yesterday at ${t}`;
  return d.toLocaleString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' }) + ' ' + t;
}

function humanSize(b) {
  if (!b) return '';
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(1) + ' MB';
}

function Attachment({ att }) {
  const isImage = (att.mime_type || '').startsWith('image/');
  if (isImage) {
    return (
      <a href={att.file_url} target="_blank" rel="noreferrer" className="inline-block max-w-[400px] mt-1 rounded-lg overflow-hidden">
        <img
          src={att.file_url}
          alt={att.file_name || 'image'}
          className="max-h-[350px] object-cover rounded-lg ring-1 ring-black/20"
          loading="lazy"
        />
      </a>
    );
  }
  return (
    <a
      href={att.file_url}
      target="_blank"
      rel="noreferrer"
      className="mt-1 inline-flex items-center gap-3 bg-app-secondary-alt hover:bg-app-700 row-hover rounded-lg p-3 ring-1 ring-app-divider max-w-md"
      download={att.file_name || true}
    >
      <span className="w-10 h-10 rounded-full bg-app-500/20 text-app-link flex items-center justify-center">
        <UploadIcon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-app-link font-medium truncate" title={att.file_name}>{att.file_name || 'Attachment'}</span>
        <span className="block text-tiny text-app-header-secondary">{humanSize(att.size_bytes)}</span>
      </span>
    </a>
  );
}

function renderContent(content) {
  if (!content) return null;
  const parts = content.split(/(@[\w.\-]{2,32})/g);
  return parts.map((p, i) =>
    /^@[\w.\-]{2,32}$/.test(p)
      ? <span key={i} className="bg-app-mention text-app-interactive-active px-0.5 rounded font-medium">{p}</span>
      : <span key={i}>{p}</span>
  );
}

function Reactions({ message }) {
  const me = useAuthStore((s) => s.user);
  const reactions = message.reactions || [];
  if (reactions.length === 0) return null;
  async function toggle(emoji) {
    try { await api.post(`/reactions/${message.id}`, { emoji }); } catch (_) { /* ignore */ }
  }
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map((r) => {
        const mine = Array.isArray(r.user_ids) && me && r.user_ids.includes(me.id);
        return (
          <button
            key={r.emoji}
            type="button"
            onClick={() => toggle(r.emoji)}
            className={
              'inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-xs border ' +
              (mine
                ? 'bg-app-500/20 border-app-500/50 text-app-interactive-active'
                : 'bg-app-secondary-alt border-transparent hover:border-app-divider text-app-text')
            }
            title={mine ? 'Remove reaction' : 'Add reaction'}
          >
            <span className="leading-none">{r.emoji}</span>
            <span className="tabular-nums">{r.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function HoverToolbar({ message, isAuthor, isMod, onReply, onEdit, onDelete, onPin, onReactPickerToggle }) {
  return (
    <div className="absolute right-3 -top-4 hidden group-hover/msg:flex items-center bg-app-floating border border-app-divider rounded-md shadow-elevation z-10">
      <button onClick={onReactPickerToggle} title="Add reaction"
        className="p-1.5 hover:bg-app-700 row-hover text-app-interactive hover:text-app-interactive-active">
        <EmojiIcon size={18} />
      </button>
      <button onClick={onReply} title="Reply"
        className="p-1.5 hover:bg-app-700 row-hover text-app-interactive hover:text-app-interactive-active">
        <ReplyIcon size={18} />
      </button>
      {isAuthor && (
        <button onClick={onEdit} title="Edit"
          className="p-1.5 hover:bg-app-700 row-hover text-app-interactive hover:text-app-interactive-active">
          <EditIcon size={18} />
        </button>
      )}
      {(isAuthor || isMod) && (
        <button onClick={onDelete} title="Delete" className="p-1.5 hover:bg-app-700 row-hover text-app-red">
          <TrashIcon size={18} />
        </button>
      )}
      {isMod && (
        <button onClick={onPin} title={message.pinned ? 'Unpin' : 'Pin'}
          className={'p-1.5 hover:bg-app-700 row-hover ' +
            (message.pinned ? 'text-app-yellow' : 'text-app-interactive hover:text-app-interactive-active')}>
          <PinIcon size={18} />
        </button>
      )}
    </div>
  );
}

function QuickReactPicker({ onPick, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="absolute right-3 -top-12 z-20 bg-app-floating border border-app-divider rounded-md shadow-elevation p-2 flex gap-1">
      {QUICK_REACTIONS.map((e) => (
        <button key={e} onClick={() => { onPick(e); onClose(); }}
          className="w-8 h-8 rounded hover:bg-app-700 flex items-center justify-center text-lg">
          {e}
        </button>
      ))}
    </div>
  );
}

function ReplyPreview({ parent }) {
  if (!parent) return null;
  const text = parent.deleted_at ? '[Message deleted]' : (parent.content || '').slice(0, 140);
  return (
    <div className="flex items-center gap-2 mb-1 text-tiny text-app-header-secondary">
      <span className="inline-block w-6 h-3 border-l-2 border-t-2 border-app-divider rounded-tl-md -mb-1" />
      <span className="font-semibold text-app-interactive">{parent.display_name || parent.username || 'someone'}</span>
      <span className="truncate text-app-muted">{text || '...'}</span>
    </div>
  );
}

export default function MessageItem({ message, compact = false, onUserClick, canModerate = false }) {
  if (message.type && message.type.startsWith('system_')) {
    return <SystemMessage message={message} />;
  }

  const me = useAuthStore((s) => s.user);
  const setReplyTo = useChatStore((s) => s.setReplyTo);
  const editingId  = useChatStore((s) => s.editingId);
  const setEditingId = useChatStore((s) => s.setEditingId);

  const isAuthor = me && me.id === message.user_id;
  const isMod = isAuthor || canModerate || me?.is_admin;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editValue, setEditValue] = useState(message.content || '');
  const inputRef = useRef(null);

  const editing = editingId === message.id;
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      const v = inputRef.current.value;
      inputRef.current.setSelectionRange(v.length, v.length);
    }
  }, [editing]);

  async function react(emoji) {
    try { await api.post(`/reactions/${message.id}`, { emoji }); } catch (_) { /* ignore */ }
  }
  async function saveEdit() {
    const v = editValue.trim();
    if (!v) return;
    try { await api.patch(`/messages/${message.id}`, { content: v }); setEditingId(null); }
    catch (_) { /* swallow */ }
  }
  async function doDelete() {
    if (!window.confirm('Delete this message?')) return;
    try { await api.delete(`/messages/${message.id}`); } catch (_) { /* swallow */ }
  }
  async function togglePin() {
    try {
      if (message.pinned) await api.delete(`/messages/${message.id}/pin`);
      else await api.post(`/messages/${message.id}/pin`);
    } catch (_) { /* swallow */ }
  }

  const atts = message.attachments || [];
  const poll = message.poll;
  const pollVotes = message.poll_votes || [];
  const isDeleted = !!message.deleted_at;

  return (
    <div
      className={
        'group/msg relative flex gap-4 hover:bg-[rgba(4,4,5,0.07)] px-4 ' +
        (compact ? 'py-[2px]' : 'mt-[17px] pt-0.5 pb-[2px]')
      }
    >
      <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-transparent group-hover/msg:bg-app-500/40" />

      {!isDeleted && !editing && (
        <HoverToolbar
          message={message}
          isAuthor={isAuthor}
          isMod={isMod}
          onReply={() => setReplyTo(message)}
          onEdit={() => { setEditingId(message.id); setEditValue(message.content || ''); }}
          onDelete={doDelete}
          onPin={togglePin}
          onReactPickerToggle={() => setPickerOpen((x) => !x)}
        />
      )}
      {pickerOpen && (
        <QuickReactPicker onPick={react} onClose={() => setPickerOpen(false)} />
      )}

      {compact ? (
        <div className="w-10 shrink-0 text-tiny text-app-muted opacity-0 group-hover/msg:opacity-100 pt-[3px] text-right pr-1 leading-none font-medium tabular-nums">
          {timeOnly(message.created_at)}
        </div>
      ) : (
        <button
          type="button"
          onClick={(e) => onUserClick && onUserClick({
            user_id: message.user_id, username: message.username,
            display_name: message.display_name, avatar_url: message.avatar_url,
            anchor: e.currentTarget,
          })}
          className="w-10 shrink-0"
        >
          <Avatar name={message.display_name || message.username} src={message.avatar_url} size={40} />
        </button>
      )}

      <div className="min-w-0 flex-1">
        {!compact && (
          <div className="flex items-baseline gap-2 leading-none">
            <button
              type="button"
              onClick={(e) => onUserClick && onUserClick({
                user_id: message.user_id, username: message.username,
                display_name: message.display_name, avatar_url: message.avatar_url,
                anchor: e.currentTarget,
              })}
              className="font-medium text-app-interactive-active text-[16px] hover:underline cursor-pointer"
            >
              {message.display_name || message.username}
            </button>
            {message.is_bot && <BotBadge size="sm" />}
            {message.pinned && (
              <span className="text-tiny inline-flex items-center gap-1 text-app-yellow">
                <PinIcon size={10} /> pinned
              </span>
            )}
            <span className="text-tiny text-app-header-secondary cursor-default" title={fullStamp(message.created_at)}>
              {fullStamp(message.created_at)}
            </span>
          </div>
        )}

        {message.parent && <ReplyPreview parent={message.parent} />}

        {isDeleted ? (
          <div className="text-app-muted italic text-message mt-1">[message deleted]</div>
        ) : editing ? (
          <div className="mt-1">
            <textarea
              ref={inputRef}
              rows={Math.min(8, (editValue.split('\n').length || 1))}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                if (e.key === 'Escape')              { e.preventDefault(); setEditingId(null); }
              }}
              className="w-full bg-app-secondary-alt rounded p-2 text-app-text text-message outline-none resize-none ring-1 ring-app-divider focus:ring-app-500"
            />
            <div className="text-tiny text-app-header-secondary mt-1">
              escape to <button className="text-app-link hover:underline" onClick={() => setEditingId(null)}>cancel</button>
              {' '}• enter to <button className="text-app-link hover:underline" onClick={saveEdit}>save</button>
            </div>
          </div>
        ) : (
          message.content && message.type !== 'poll' && (
            <div className={'text-app-text whitespace-pre-wrap break-words text-message ' + (compact ? '' : 'mt-1')}>
              {renderContent(message.content)}
              {message.edited_at && (
                <span className="ml-1 text-tiny text-app-muted" title={fullStamp(message.edited_at)}>(edited)</span>
              )}
            </div>
          )
        )}

        {!isDeleted && atts.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            {atts.map((a) => <Attachment key={a.id} att={a} />)}
          </div>
        )}
        {!isDeleted && poll && <Poll poll={poll} votes={pollVotes} />}
        {!isDeleted && <Reactions message={message} />}
      </div>
    </div>
  );
}
