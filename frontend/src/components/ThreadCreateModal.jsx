import { useState } from 'react';
import api from '../services/api';
import { CloseIcon, ThreadIcon } from './icons';

export default function ThreadCreateModal({ channelId, channelName, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [first, setFirst] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  async function submit() {
    setErr(null);
    if (!name.trim()) return setErr('Thread name is required');
    setSubmitting(true);
    try {
      const { data } = await api.post(`/threads/channel/${channelId}`, {
        name: name.trim(),
        first_message: first.trim() || null,
      });
      onCreated && onCreated(data.thread);
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-app-800 rounded-md w-full max-w-md shadow-elevation overflow-hidden animate-modal-in">
        <div className="px-6 pt-5 pb-3 flex items-start justify-between border-b border-app-divider">
          <div className="flex items-center gap-2">
            <ThreadIcon size={20} className="text-app-link" />
            <h3 className="text-lg font-bold text-app-header">Create Thread</h3>
          </div>
          <button onClick={onClose} className="text-app-interactive hover:text-app-interactive-active p-1 -mr-2 -mt-1 press-feedback">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-tiny uppercase font-bold tracking-wide text-app-header-secondary mb-1.5">Thread Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 100))}
              placeholder="What's this thread about?"
              className="w-full bg-app-950 border border-transparent focus:border-app-500 outline-none rounded px-3 py-2.5 text-app-interactive-active"
            />
            <div className="text-tiny text-app-header-secondary mt-1">in #{channelName}</div>
          </div>
          <div>
            <label className="block text-tiny uppercase font-bold tracking-wide text-app-header-secondary mb-1.5">First Message (optional)</label>
            <textarea
              value={first}
              onChange={(e) => setFirst(e.target.value.slice(0, 2000))}
              rows={3}
              placeholder="Start the conversation…"
              className="w-full bg-app-950 border border-transparent focus:border-app-500 outline-none rounded px-3 py-2.5 text-app-interactive-active text-sm resize-none"
            />
          </div>
          {err && <div className="text-app-red text-sm bg-app-red/15 rounded px-3 py-2">{err}</div>}
        </div>

        <div className="bg-app-900 px-6 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="text-app-interactive-active text-sm hover:underline px-3 py-2">Cancel</button>
          <button onClick={submit} disabled={submitting} className="bg-app-500 hover:bg-app-400 disabled:opacity-60 text-white text-sm font-medium rounded px-5 py-2 press-feedback">
            {submitting ? 'Creating…' : 'Create Thread'}
          </button>
        </div>
      </div>
    </div>
  );
}
