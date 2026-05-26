import { useState } from 'react';
import api from '../services/api';
import { CloseIcon, PollIcon, PlusIcon } from './icons';

export default function PollCreateModal({ channelId, channelName, onClose }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multi, setMulti] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  function setOpt(i, v) { setOptions((arr) => arr.map((o, idx) => idx === i ? v : o)); }
  function addOpt() { setOptions((arr) => arr.length >= 10 ? arr : [...arr, '']); }
  function removeOpt(i) { setOptions((arr) => arr.length <= 2 ? arr : arr.filter((_, idx) => idx !== i)); }

  async function submit() {
    setErr(null);
    const clean = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim()) return setErr('Question is required');
    if (clean.length < 2) return setErr('Add at least 2 options');
    setSubmitting(true);
    try {
      await api.post(`/polls/channel/${channelId}`, { question: question.trim(), options: clean, multi_select: multi });
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
            <PollIcon size={20} className="text-app-link" />
            <h3 className="text-lg font-bold text-app-header">Create Poll</h3>
          </div>
          <button onClick={onClose} className="text-app-interactive hover:text-app-interactive-active p-1 -mr-2 -mt-1 press-feedback">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-tiny uppercase font-bold tracking-wide text-app-header-secondary mb-1.5">Question</label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, 300))}
              placeholder={`Ask #${channelName || 'channel'} a question…`}
              className="w-full bg-app-950 border border-transparent focus:border-app-500 outline-none rounded px-3 py-2.5 text-app-interactive-active"
            />
          </div>

          <div>
            <label className="block text-tiny uppercase font-bold tracking-wide text-app-header-secondary mb-1.5">Options</label>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-tiny text-app-header-secondary w-5">{i + 1}.</span>
                  <input
                    value={o}
                    onChange={(e) => setOpt(i, e.target.value.slice(0, 80))}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 bg-app-950 border border-transparent focus:border-app-500 outline-none rounded px-3 py-2 text-app-interactive-active text-sm"
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOpt(i)}
                      className="text-app-muted hover:text-app-red p-1 press-feedback"
                      aria-label="Remove option"
                    >
                      <CloseIcon size={16} />
                    </button>
                  )}
                </div>
              ))}
              {options.length < 10 && (
                <button
                  onClick={addOpt}
                  className="text-sm text-app-link hover:underline flex items-center gap-1.5 mt-1"
                >
                  <PlusIcon size={14} /> Add another answer
                </button>
              )}
            </div>
          </div>

          <label className="flex items-center justify-between py-2 cursor-pointer">
            <div>
              <div className="text-sm text-app-interactive-active font-medium">Allow multiple choices</div>
              <div className="text-tiny text-app-header-secondary">People can pick more than one option.</div>
            </div>
            <span className={'relative inline-block w-[42px] h-[24px] rounded-full transition-colors ' + (multi ? 'bg-app-green' : 'bg-app-600')}>
              <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} className="absolute inset-0 opacity-0 cursor-pointer" />
              <span className={'absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform ' + (multi ? 'translate-x-[18px]' : '')} />
            </span>
          </label>

          {err && <div className="text-app-red text-sm bg-app-red/15 rounded px-3 py-2">{err}</div>}
        </div>

        <div className="bg-app-900 px-6 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="text-app-interactive-active text-sm hover:underline px-3 py-2">Cancel</button>
          <button onClick={submit} disabled={submitting} className="bg-app-500 hover:bg-app-400 disabled:opacity-60 text-white text-sm font-medium rounded px-5 py-2 press-feedback">
            {submitting ? 'Posting…' : 'Post Poll'}
          </button>
        </div>
      </div>
    </div>
  );
}
