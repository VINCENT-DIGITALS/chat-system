import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../services/socket';
import api from '../services/api';
import {
  SendIcon, PlusIcon, CloseIcon, ImageIcon, UploadIcon,
  GiftIcon, GifIcon, StickerIcon, EmojiIcon,
  ThreadIcon, PollIcon, AppsIcon, ReplyIcon,
} from './icons';
import { useChatStore } from '../store/chat';

function humanSize(b) {
  if (!b) return '';
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(1) + ' MB';
}

export default function MessageInput({ channelId, conversationId, placeholder, onCreateThread, onCreatePoll }) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [popOpen, setPopOpen] = useState(false);
  const [pending, setPending] = useState([]); // [{ url, name, mime_type, size_bytes, previewUrl }]
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const replyTo    = useChatStore((s) => s.replyTo);
  const setReplyTo = useChatStore((s) => s.setReplyTo);
  const typingRef = useRef(false);
  const stopTimeoutRef = useRef(null);
  const taRef = useRef(null);
  const fileRef = useRef(null);
  const imageRef = useRef(null);
  const popRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 240) + 'px';
  }, [value]);

  // Reset on channel/conversation change
  useEffect(() => {
    setValue(''); setPending([]); setPopOpen(false); setUploadError(null);
  }, [channelId, conversationId]);

  // Click outside popover closes
  useEffect(() => {
    function onDown(e) {
      if (popOpen && popRef.current && !popRef.current.contains(e.target)) setPopOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [popOpen]);

  function emitTyping() {
    const socket = getSocket();
    if (!socket) return;
    const payload = channelId
      ? { channel_id: channelId }
      : conversationId ? { conversation_id: conversationId } : null;
    if (!payload) return;
    if (!typingRef.current) {
      socket.emit('typing:start', payload);
      typingRef.current = true;
    }
    clearTimeout(stopTimeoutRef.current);
    stopTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', payload);
      typingRef.current = false;
    }, 2000);
  }

  async function uploadFile(file) {
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post(`/messages/channel/${channelId}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const attachment = {
        ...data.attachment,
        previewUrl: /^image\//.test(file.type) ? URL.createObjectURL(file) : null,
      };
      setPending((p) => [...p, attachment]);
    } catch (e) {
      setUploadError(e?.response?.data?.error || e.message);
    } finally {
      setUploading(false);
    }
  }

  async function onPickFiles(e) {
    const files = Array.from(e.target.files || []);
    for (const f of files) await uploadFile(f);
    if (e.target) e.target.value = '';
  }

  function removePending(idx) {
    setPending((p) => {
      const next = [...p];
      const [removed] = next.splice(idx, 1);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }

  function send(e) {
    e?.preventDefault?.();
    const content = value.trim();
    if (!content && pending.length === 0) return;
    const socket = getSocket();
    if (!socket) return;
    const attachments = pending.map(({ previewUrl, ...rest }) => rest);
    const parent_message_id = replyTo?.id || null;
    if (channelId) {
      socket.emit('message:send', { channel_id: channelId, content, attachments, parent_message_id });
      socket.emit('typing:stop', { channel_id: channelId });
    } else if (conversationId) {
      socket.emit('dm:send', { conversation_id: conversationId, content, parent_message_id });
      socket.emit('typing:stop', { conversation_id: conversationId });
    } else {
      return;
    }
    setValue('');
    pending.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
    setPending([]);
    typingRef.current = false;
    setReplyTo(null);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <form onSubmit={send} className="px-3 sm:px-4 pb-3 sm:pb-6">
      {/* Reply preview row */}
      {replyTo && (
        <div className="bg-app-secondary-alt rounded-t-md px-3 py-1.5 flex items-center gap-2 text-tiny border-b border-app-divider">
          <ReplyIcon size={14} className="text-app-channel" />
          <span className="text-app-header-secondary">
            Replying to <span className="font-semibold text-app-interactive">{replyTo.display_name || replyTo.username || 'someone'}</span>
          </span>
          <span className="truncate text-app-muted">{(replyTo.content || '').slice(0, 80) || '[attachment]'}</span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="p-1 text-app-interactive hover:text-app-interactive-active row-hover rounded"
            aria-label="Cancel reply"
          >
            <CloseIcon size={14} />
          </button>
        </div>
      )}

      {/* Attachment preview row */}
      {pending.length > 0 && (
        <div className="bg-app-700 rounded-t-lg px-4 py-3 border-b border-app-900 flex gap-3 flex-wrap">
          {pending.map((a, idx) => (
            <div key={idx} className="relative group bg-app-secondary-alt rounded p-2 w-[180px]">
              <button
                type="button"
                onClick={() => removePending(idx)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-app-red text-white shadow-elevation flex items-center justify-center press-feedback opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove attachment"
              >
                <CloseIcon size={14} />
              </button>
              {a.previewUrl ? (
                <img src={a.previewUrl} alt={a.name} className="w-full h-[110px] object-cover rounded" />
              ) : (
                <div className="w-full h-[110px] rounded bg-app-900 flex items-center justify-center text-app-channel">
                  <UploadIcon size={32} />
                </div>
              )}
              <div className="mt-1.5 text-tiny text-app-interactive-active truncate" title={a.name}>{a.name}</div>
              <div className="text-tiny text-app-header-secondary">{humanSize(a.size_bytes)}</div>
            </div>
          ))}
          {uploading && (
            <div className="w-[180px] h-[150px] flex items-center justify-center text-tiny text-app-header-secondary skeleton" />
          )}
        </div>
      )}

      {uploadError && (
        <div className="bg-app-red/15 text-app-red text-xs rounded px-3 py-2 mb-1">{uploadError}</div>
      )}

      <div
        className={
          'bg-app-700 flex items-end px-3 py-2.5 gap-2 transition-shadow duration-100 ' +
          (pending.length > 0 ? 'rounded-b-lg' : 'rounded-lg') + ' ' +
          (focused ? 'shadow-focus-brand' : 'shadow-ring')
        }
      >
        {/* + button + popover */}
        <div className="relative self-center" ref={popRef}>
          <button
            type="button"
            onClick={() => setPopOpen((v) => !v)}
            className={
              'rounded-full row-hover p-1 press-feedback transition-transform ' +
              (popOpen
                ? 'bg-app-interactive text-app-800 rotate-45'
                : 'text-app-interactive hover:text-app-interactive-active hover:bg-app-interactive/10')
            }
            title="Attach"
            aria-label="Attach a file"
          >
            <PlusIcon size={20} />
          </button>
          {popOpen && (
            <div
              className="absolute bottom-full mb-2 left-0 z-30 w-[224px] bg-app-floating text-app-interactive-active rounded-md shadow-elevation overflow-hidden animate-modal-in py-1"
            >
              <PopItem
                icon={<UploadIcon size={18} />}
                label="Upload a File"
                onClick={() => { fileRef.current?.click(); setPopOpen(false); }}
              />
              <PopItem
                icon={<ThreadIcon size={18} />}
                label="Create Thread"
                onClick={() => { onCreateThread && onCreateThread(); setPopOpen(false); }}
              />
              <PopItem
                icon={<PollIcon size={18} />}
                label="Create Poll"
                onClick={() => { onCreatePoll && onCreatePoll(); setPopOpen(false); }}
              />
              <PopItem
                icon={<AppsIcon size={18} />}
                label="Use Apps"
                onClick={() => { alert('Apps integrations are not enabled yet.'); setPopOpen(false); }}
              />
            </div>
          )}
          <input ref={fileRef} type="file" multiple className="hidden" onChange={onPickFiles} />
          <input ref={imageRef} type="file" accept="image/*" multiple className="hidden" onChange={onPickFiles} />
        </div>

        <textarea
          ref={taRef}
          rows={1}
          value={value}
          onChange={(e) => { setValue(e.target.value); emitTyping(); }}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder || 'Message'}
          className="flex-1 bg-transparent outline-none text-app-interactive-active placeholder:text-app-muted resize-none py-1 leading-snug max-h-[240px] text-[16px]"
        />

        {/* Right-side action icons (Discord exact: Gift, GIF, Sticker, Emoji) */}
        <div className="flex items-center gap-0.5 self-center">
          <button
            type="button"
            tabIndex={-1}
            className="p-1.5 rounded text-app-interactive hover:text-app-interactive-active row-hover press-feedback"
            title="Send a gift"
            aria-label="Send a gift"
          >
            <GiftIcon size={22} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            className="p-1.5 rounded text-app-interactive hover:text-app-interactive-active row-hover press-feedback"
            title="GIF"
            aria-label="GIF"
          >
            <GifIcon size={22} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            className="p-1.5 rounded text-app-interactive hover:text-app-interactive-active row-hover press-feedback"
            title="Stickers"
            aria-label="Stickers"
          >
            <StickerIcon size={22} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            className="p-1.5 rounded text-app-interactive hover:text-app-interactive-active row-hover press-feedback"
            title="Emoji"
            aria-label="Emoji"
          >
            <EmojiIcon size={22} />
          </button>
          {(value.trim() || pending.length > 0) && (
            <button
              type="submit"
              className="ml-0.5 p-1.5 rounded text-app-500 hover:text-app-400 press-feedback ring-focus"
              aria-label="Send message"
              title="Send (Enter)"
            >
              <SendIcon size={22} />
            </button>
          )}
        </div>
      </div>

      <div className="hidden sm:flex items-center justify-between text-tiny text-app-header-secondary px-2 mt-1 font-medium">
        <div><kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> for new line</div>
        {value.length > 0 && <div className="tabular-nums">{value.length}/2000</div>}
      </div>
    </form>
  );
}

function PopItem({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-2 mx-1 py-2 rounded text-left text-[14px] font-medium text-app-interactive-active hover:bg-app-500 hover:text-white row-hover press-feedback"
    >
      <span className="text-app-interactive group-hover:text-white">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
