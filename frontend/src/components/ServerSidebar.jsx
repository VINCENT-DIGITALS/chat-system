import { useState } from 'react';
import { classNames, initials } from '../lib/utils';
import { useChatStore } from '../store/chat';
import { useBrandingStore } from '../store/branding';
import { CompassIcon, PlusIcon, CloseIcon } from './icons';
import Tooltip from './Tooltip';

function ServerIcon({ server, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Tooltip label={server.name} side="right">
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className={classNames(
          'relative group w-12 h-12 transition-[border-radius,background-color,color] duration-200 ease-app flex items-center justify-center font-semibold overflow-hidden press-feedback ring-focus',
          active
            ? 'rounded-2xl bg-app-500 text-white'
            : 'rounded-[24px] hover:rounded-2xl bg-app-700 text-app-text hover:bg-app-500 hover:text-white'
        )}
        aria-label={server.name}
      >
        <span
          className={classNames('server-pill', active ? 'active' : hovered ? 'hovered' : '')}
        />
        {server.icon_url ? (
          <img src={server.icon_url} alt={server.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm tracking-wide">{initials(server.name)}</span>
        )}
      </button>
    </Tooltip>
  );
}

function ActionIcon({ label, color = 'green', onClick, children }) {
  const colors = {
    green: 'hover:bg-app-green text-app-green',
    blurple: 'hover:bg-app-500 text-app-500',
  };
  return (
    <Tooltip label={label} side="right">
      <button
        onClick={onClick}
        className={classNames(
          'w-12 h-12 rounded-[24px] hover:rounded-2xl bg-app-700 hover:text-white transition-[border-radius,background-color,color] duration-200 ease-app flex items-center justify-center press-feedback ring-focus',
          colors[color]
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}

export default function ServerSidebar() {
  const { servers, currentServerId, selectServer, createServer, joinServer } = useChatStore();
  const brand = useBrandingStore();
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState('create');
  const [name, setName] = useState('');
  const [invite, setInvite] = useState('');
  const [err, setErr] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      if (mode === 'create') {
        const s = await createServer(name);
        await selectServer(s.id);
      } else {
        const s = await joinServer(invite);
        await selectServer(s.id);
      }
      setShowModal(false);
      setName('');
      setInvite('');
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <aside className="w-[72px] bg-app-950 flex flex-col items-center pt-3 gap-2 shrink-0 h-full overflow-y-auto scrollbar-none">
      {/* "Home" / brand */}
      <Tooltip label={brand.app_name} side="right">
        <button
          onClick={() => selectServer(null)}
          className="relative w-12 h-12 rounded-[24px] hover:rounded-2xl bg-app-500 hover:bg-app-400 text-white transition-[border-radius,background-color] duration-200 ease-app flex items-center justify-center font-extrabold press-feedback ring-focus"
        >
          <span className="text-[15px] tracking-wider">{brand.app_short || 'CS'}</span>
        </button>
      </Tooltip>

      <div className="w-8 h-[2px] rounded-full bg-app-divider my-1" />

      <div className="flex flex-col items-center gap-2 px-1">
        {servers.map((s) => (
          <ServerIcon
            key={s.id}
            server={s}
            active={currentServerId === s.id}
            onClick={() => selectServer(s.id)}
          />
        ))}

        <ActionIcon label="Add a Server" color="green" onClick={() => { setMode('create'); setShowModal(true); }}>
          <PlusIcon size={22} />
        </ActionIcon>

        <ActionIcon label="Join a Server" color="green" onClick={() => { setMode('join'); setShowModal(true); }}>
          <CompassIcon size={22} />
        </ActionIcon>
      </div>

      <div className="pb-3" />

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-app-800 rounded-md w-full max-w-md shadow-elevation overflow-hidden animate-modal-in">
            <div className="px-6 pt-6 pb-2 flex items-start justify-between">
              <div>
                <h3 className="text-[24px] font-bold text-app-header leading-tight">
                  {mode === 'create' ? 'Customize Your Server' : 'Join a Server'}
                </h3>
                <p className="text-sm text-app-header-secondary mt-2 leading-snug">
                  {mode === 'create'
                    ? "Give your new server a personality with a name. You can always change it later."
                    : 'Enter an invite below to join an existing server.'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-app-interactive hover:text-app-interactive-active p-1 -mt-1 -mr-2 ring-focus rounded press-feedback"
                aria-label="Close"
              >
                <CloseIcon size={22} />
              </button>
            </div>

            <div className="flex gap-2 px-6 mt-2">
              {[
                { v: 'create', label: 'Create My Own' },
                { v: 'join', label: 'Join with Invite' },
              ].map((t) => (
                <button
                  key={t.v}
                  onClick={() => setMode(t.v)}
                  className={classNames(
                    'flex-1 py-2 rounded text-sm font-medium transition-colors press-feedback',
                    mode === t.v
                      ? 'bg-app-500 text-white'
                      : 'bg-app-700 text-app-interactive hover:text-app-interactive-active'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="px-6 py-6 space-y-4">
              {mode === 'create' ? (
                <div>
                  <label className="block text-eyebrow uppercase font-bold text-app-header-secondary mb-2">
                    Server Name
                  </label>
                  <input
                    required
                    autoFocus
                    placeholder="My Awesome Server"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-app-950 border border-transparent focus:border-app-500 outline-none rounded px-3 py-2.5 text-app-interactive-active placeholder:text-app-muted transition-colors ring-focus"
                  />
                  <p className="text-tiny text-app-header-secondary mt-2">
                    By creating a server, you agree to the community guidelines.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-eyebrow uppercase font-bold text-app-header-secondary mb-2">
                    Invite Code <span className="text-app-red">*</span>
                  </label>
                  <input
                    required
                    autoFocus
                    placeholder="abc123def456"
                    value={invite}
                    onChange={(e) => setInvite(e.target.value)}
                    className="w-full bg-app-950 border border-transparent focus:border-app-500 outline-none rounded px-3 py-2.5 text-app-interactive-active placeholder:text-app-muted font-mono transition-colors ring-focus"
                  />
                  <p className="text-tiny text-app-header-secondary mt-2">
                    Invites should look like: <span className="font-mono text-app-text">e64f8a23bc91</span>
                  </p>
                </div>
              )}
              {err && (
                <div className="bg-app-red/15 border border-app-red/30 text-app-red text-sm rounded px-3 py-2">
                  {err}
                </div>
              )}
            </form>

            <div className="bg-[#2b2d31] px-6 py-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-app-interactive-active text-sm hover:underline press-feedback"
              >
                Back
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="px-5 py-2 bg-app-500 hover:bg-app-400 disabled:opacity-60 text-white text-sm font-medium rounded press-feedback transition-colors"
              >
                {submitting ? 'Submitting…' : mode === 'create' ? 'Create' : 'Join Server'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
