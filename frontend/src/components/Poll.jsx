import { useMemo } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/auth';
import { PollIcon, CheckIcon } from './icons';

export default function Poll({ poll, votes }) {
  const meId = useAuthStore((s) => s.user?.id);
  if (!poll) return null;

  const counts = useMemo(() => {
    const map = {};
    (poll.options || []).forEach((o) => { map[o.idx] = 0; });
    (votes || []).forEach((v) => { map[v.option_idx] = (map[v.option_idx] || 0) + 1; });
    return map;
  }, [poll, votes]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const myVotes = useMemo(
    () => new Set((votes || []).filter((v) => v.user_id === meId).map((v) => v.option_idx)),
    [votes, meId]
  );

  async function vote(idx) {
    try {
      if (myVotes.has(idx) && !poll.multi_select) {
        await api.delete(`/polls/${poll.id}/vote/${idx}`);
      } else {
        await api.post(`/polls/${poll.id}/vote`, { option_idx: idx });
      }
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    }
  }

  return (
    <div className="mt-1 max-w-md rounded-lg bg-app-secondary-alt p-3 ring-1 ring-app-divider">
      <div className="flex items-center gap-2 text-tiny uppercase font-bold tracking-wide text-app-header-secondary">
        <PollIcon size={14} className="text-app-link" />
        Poll
      </div>
      <div className="mt-1 text-app-header font-semibold text-[16px] leading-snug">{poll.question}</div>

      <div className="mt-3 space-y-2">
        {(poll.options || []).map((o) => {
          const c = counts[o.idx] || 0;
          const pct = total === 0 ? 0 : Math.round((c / total) * 100);
          const mine = myVotes.has(o.idx);
          return (
            <button
              key={o.idx}
              onClick={() => vote(o.idx)}
              className={
                'relative w-full text-left rounded border row-hover press-feedback transition-colors ' +
                (mine
                  ? 'border-app-500 bg-app-500/10'
                  : 'border-app-divider hover:border-app-channel bg-app-900/30')
              }
            >
              {/* Vote-share bar */}
              <span
                className="absolute inset-y-0 left-0 rounded-l bg-app-500/20"
                style={{ width: pct + '%' }}
              />
              <span className="relative flex items-center gap-2 px-3 py-2">
                <span
                  className={
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center ' +
                    (mine ? 'border-app-500 bg-app-500' : 'border-app-channel')
                  }
                >
                  {mine && <CheckIcon size={10} className="text-white" />}
                </span>
                <span className="text-[15px] text-app-interactive-active flex-1">{o.text}</span>
                <span className="text-tiny font-semibold tabular-nums text-app-header-secondary min-w-[40px] text-right">
                  {pct}%
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 text-tiny text-app-header-secondary">
        {total} {total === 1 ? 'vote' : 'votes'}
      </div>
    </div>
  );
}
