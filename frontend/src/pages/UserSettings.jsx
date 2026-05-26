import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useThemeStore } from '../store/theme';
import api from '../services/api';
import Avatar from '../components/Avatar';
import Toast from '../components/Toast';
import { BotBadge, AdminBadge } from '../components/Badge';
import {
  CloseIcon, KeyIcon, ImageIcon, BellIcon, PaintIcon, LogoutIcon,
  ChevronRightIcon, MicIcon, UploadIcon, CheckIcon, ShieldIcon,
} from '../components/icons';

const SECTIONS = [
  { group: 'User Settings', items: [
    { id: 'account',  label: 'My Account' },
    { id: 'profile',  label: 'Profiles' },
    { id: 'privacy',  label: 'Privacy & Safety' },
    { id: 'devices',  label: 'Devices' },
  ]},
  { group: 'App Settings', items: [
    { id: 'appearance',   label: 'Appearance' },
    { id: 'notifications',label: 'Notifications' },
    { id: 'voice',        label: 'Voice & Video' },
    { id: 'language',     label: 'Language' },
  ]},
];

export default function UserSettings() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const sectionParam = params.get('s') || 'account';
  const [section, setSection] = useState(sectionParam);
  const { user, logout, fetchMe } = useAuthStore();
  const [toast, setToast] = useState(null);

  useEffect(() => { setParams({ s: section }, { replace: true }); }, [section, setParams]);

  // ESC closes
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') navigate(-1); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  function showToast(msg, kind = 'success') {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 1800);
  }

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-app-800 text-app-text animate-fade-in">
      {/* Left sidebar */}
      <aside className="w-[218px] sm:w-[232px] md:w-[260px] lg:w-[300px] bg-app-900 flex-shrink-0 flex flex-col items-end overflow-y-auto scrollbar-thin">
        <div className="w-full max-w-[220px] py-[60px] px-2.5">
          {SECTIONS.map((g) => (
            <div key={g.group} className="mt-4 first:mt-0">
              <div className="px-2.5 py-1.5 text-tiny uppercase font-bold tracking-wide text-app-header-secondary">
                {g.group}
              </div>
              {g.items.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={
                    'w-full text-left px-2.5 py-1.5 rounded text-[16px] font-medium row-hover ' +
                    (section === s.id
                      ? 'bg-[rgba(78,80,88,0.6)] text-app-interactive-active'
                      : 'text-app-interactive hover:bg-[rgba(78,80,88,0.3)] hover:text-app-interactive-hover')
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          ))}

          <div className="my-2 mx-2.5 border-t border-app-divider" />

          <button
            onClick={() => {
              if (confirm('Log out?')) logout();
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[16px] text-app-interactive hover:bg-app-red/20 hover:text-app-red row-hover"
          >
            Log Out
            <LogoutIcon size={16} />
          </button>

          <div className="mt-6 px-2.5 text-tiny text-app-muted">
            v1.0 · Click outside to close
          </div>
        </div>
      </aside>

      {/* Content panel */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-[740px] py-[60px] px-10">
          {section === 'account' && (
            <AccountSection user={user} onChanged={() => fetchMe()} toast={showToast} />
          )}
          {section === 'profile' && (
            <ProfileSection user={user} onChanged={() => fetchMe()} toast={showToast} />
          )}
          {section === 'privacy' && <Placeholder title="Privacy & Safety" />}
          {section === 'devices' && <Placeholder title="Devices" />}
          {section === 'appearance' && <AppearanceSection />}
          {section === 'notifications' && <NotificationsSection />}
          {section === 'voice' && <VoiceVideoSection />}
          {section === 'language' && <Placeholder title="Language" />}
        </div>
      </main>

      {/* Close column (Discord shows X + ESC hint on right) */}
      <div className="w-[60px] sm:w-[80px] md:w-[100px] lg:w-[150px] flex-shrink-0 pt-[60px]">
        <div className="flex flex-col items-start">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full border-2 border-app-interactive/40 hover:border-app-interactive-active text-app-interactive hover:text-app-interactive-active row-hover flex items-center justify-center press-feedback"
            aria-label="Close settings"
          >
            <CloseIcon size={18} />
          </button>
          <span className="text-tiny font-bold text-app-interactive mt-1.5 ml-2">ESC</span>
        </div>
      </div>

      {toast && <Toast show={!!toast} kind={toast.kind}>{toast.msg}</Toast>}
    </div>
  );
}

// =================== sections ===================

function H1({ children }) {
  return <h1 className="text-xl font-bold text-app-header mb-5 tracking-tight">{children}</h1>;
}
function H2({ children }) {
  return <h2 className="text-tiny uppercase font-bold tracking-wide text-app-header-secondary mb-2">{children}</h2>;
}

function Divider() {
  return <hr className="my-6 border-app-divider/60" />;
}

function Placeholder({ title }) {
  return (
    <>
      <H1>{title}</H1>
      <div className="bg-app-900 rounded p-6 text-center text-app-header-secondary">
        Coming soon — this section is reserved.
      </div>
    </>
  );
}

// ----- My Account -----
function AccountSection({ user, onChanged, toast }) {
  const [pwModal, setPwModal] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwErr, setPwErr] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);

  async function savePassword(e) {
    e.preventDefault();
    setPwErr(null);
    setPwLoading(true);
    try {
      await api.post('/users/me/password', { current_password: pwCurrent, new_password: pwNew });
      setPwModal(false);
      setPwCurrent(''); setPwNew('');
      toast('Password updated');
    } catch (e) {
      setPwErr(e?.response?.data?.error || e.message);
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <>
      <H1>My Account</H1>

      {/* Banner card */}
      <div className="rounded-lg overflow-hidden bg-app-900">
        <div className="h-[100px]" style={{ backgroundColor: user.banner_color || '#5865f2' }} />
        <div className="p-4 flex items-center gap-4 -mt-[40px]">
          <div className="rounded-full ring-[6px] ring-app-900">
            <Avatar name={user.display_name || user.username} src={user.avatar_url} size={80} />
          </div>
          <div className="flex-1 min-w-0 mt-[40px]">
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold text-app-header truncate">
                {user.display_name || user.username}
              </span>
              {user.is_bot && <BotBadge size="md" />}
              {user.is_admin && <AdminBadge />}
            </div>
            <div className="text-tiny text-app-header-secondary mt-0.5">@{user.username}</div>
          </div>
        </div>

        <div className="px-4 pb-4 space-y-2">
          <Field label="Display Name" value={user.display_name || user.username} />
          <Field label="Username"    value={user.username} />
          <Field label="Email"       value={user.email} />
          <PasswordField onChangeClick={() => setPwModal(true)} />
        </div>
      </div>

      <Divider />

      <H2>Account Removal</H2>
      <p className="text-sm text-app-header-secondary mb-3">
        Disabling your account means you can recover it at any time after taking this action.
      </p>
      <div className="flex gap-2">
        <button className="border-2 border-app-red/60 text-app-red hover:bg-app-red hover:text-white px-4 py-2 text-sm font-medium rounded transition-colors press-feedback">
          Disable Account
        </button>
        <button className="bg-app-red hover:bg-app-red/80 text-white px-4 py-2 text-sm font-medium rounded press-feedback">
          Delete Account
        </button>
      </div>

      {pwModal && (
        <Modal title="Update your password" onClose={() => setPwModal(false)}>
          <form onSubmit={savePassword} className="space-y-4">
            <LabeledInput label="CURRENT PASSWORD" type="password" value={pwCurrent} onChange={setPwCurrent} required />
            <LabeledInput label="NEW PASSWORD"     type="password" value={pwNew} onChange={setPwNew} required minLength={6} />
            {pwErr && <div className="text-app-red text-sm bg-app-red/15 px-3 py-2 rounded">{pwErr}</div>}
          </form>
          <ModalFooter
            onCancel={() => setPwModal(false)}
            onConfirm={savePassword}
            confirmLabel={pwLoading ? 'Saving…' : 'Done'}
            confirmDisabled={pwLoading}
          />
        </Modal>
      )}
    </>
  );
}

function Field({ label, value }) {
  return (
    <div className="flex items-center justify-between bg-app-secondary-alt rounded p-3">
      <div className="min-w-0">
        <div className="text-tiny uppercase font-bold tracking-wide text-app-header-secondary">{label}</div>
        <div className="text-app-interactive-active text-sm mt-0.5 truncate">{value}</div>
      </div>
      <button className="bg-app-700 hover:bg-app-600 text-app-interactive-active text-sm font-medium px-4 py-1.5 rounded press-feedback row-hover">
        Edit
      </button>
    </div>
  );
}

function PasswordField({ onChangeClick }) {
  return (
    <div className="flex items-center justify-between bg-app-secondary-alt rounded p-3">
      <div className="min-w-0">
        <div className="text-tiny uppercase font-bold tracking-wide text-app-header-secondary">Password</div>
        <div className="text-app-interactive-active text-sm mt-0.5">•••••••••••</div>
      </div>
      <button
        onClick={onChangeClick}
        className="bg-app-500 hover:bg-app-400 text-white text-sm font-medium px-4 py-1.5 rounded press-feedback"
      >
        Change Password
      </button>
    </div>
  );
}

// ----- Profile -----
function ProfileSection({ user, onChanged, toast }) {
  const [displayName, setDisplayName] = useState(user.display_name || '');
  const [pronouns, setPronouns] = useState(user.pronouns || '');
  const [bio, setBio] = useState(user.bio || '');
  const [bannerColor, setBannerColor] = useState(user.banner_color || '#5865f2');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef(null);

  const dirty =
    (displayName || '') !== (user.display_name || '') ||
    (pronouns || '') !== (user.pronouns || '') ||
    (bio || '') !== (user.bio || '') ||
    (bannerColor || '') !== (user.banner_color || '');

  async function save() {
    setSavingProfile(true);
    try {
      await api.put('/users/me', { display_name: displayName, pronouns, bio, banner_color: bannerColor });
      await onChanged();
      toast('Profile saved');
    } catch (e) {
      toast(e?.response?.data?.error || e.message, 'danger');
    } finally {
      setSavingProfile(false);
    }
  }

  async function uploadAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      await api.post('/users/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      await onChanged();
      toast('Avatar updated');
    } catch (e) {
      toast(e?.response?.data?.error || e.message, 'danger');
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function removeAvatar() {
    setUploadingAvatar(true);
    try {
      await api.delete('/users/me/avatar');
      await onChanged();
      toast('Avatar removed');
    } catch (e) {
      toast(e?.response?.data?.error || e.message, 'danger');
    } finally {
      setUploadingAvatar(false);
    }
  }

  return (
    <>
      <H1>Profiles</H1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Editor */}
        <div className="space-y-5">
          <div>
            <H2>Display Name</H2>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={32}
              placeholder={user.username}
              className="w-full bg-app-950 border border-transparent focus:border-app-500 outline-none rounded px-3 py-2.5 text-app-interactive-active text-[16px]"
            />
          </div>

          <div>
            <H2>Pronouns</H2>
            <input
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              maxLength={40}
              placeholder="Add your pronouns"
              className="w-full bg-app-950 border border-transparent focus:border-app-500 outline-none rounded px-3 py-2.5 text-app-interactive-active text-[16px]"
            />
          </div>

          <div>
            <H2>Avatar</H2>
            <input ref={fileRef} type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
            <div className="flex gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="bg-app-500 hover:bg-app-400 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded press-feedback flex items-center gap-2"
              >
                <UploadIcon size={16} />
                {uploadingAvatar ? 'Uploading…' : 'Change Avatar'}
              </button>
              {user.avatar_url && (
                <button
                  onClick={removeAvatar}
                  disabled={uploadingAvatar}
                  className="text-app-interactive-active hover:underline text-sm font-medium px-4 py-2"
                >
                  Remove Avatar
                </button>
              )}
            </div>
          </div>

          <div>
            <H2>Banner Color</H2>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={bannerColor}
                onChange={(e) => setBannerColor(e.target.value)}
                className="w-12 h-10 bg-transparent border border-app-divider rounded cursor-pointer"
              />
              <span className="font-mono text-sm text-app-interactive-active">{bannerColor}</span>
            </div>
          </div>

          <div>
            <H2>About Me <span className="text-app-muted normal-case font-normal tracking-normal">— You can use markdown and links if you'd like.</span></H2>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 190))}
              rows={3}
              maxLength={190}
              placeholder="Tell people a bit about yourself…"
              className="w-full bg-app-950 border border-transparent focus:border-app-500 outline-none rounded px-3 py-2.5 text-app-interactive-active text-[16px] resize-none"
            />
            <div className="flex justify-end text-tiny text-app-header-secondary mt-1">
              {bio.length}/190
            </div>
          </div>
        </div>

        {/* Live preview card */}
        <div>
          <H2>Preview</H2>
          <div className="rounded-lg overflow-hidden bg-app-secondary-alt shadow-elevation">
            <div className="h-[60px]" style={{ backgroundColor: bannerColor }} />
            <div className="px-4 pb-4 -mt-[32px]">
              <div className="rounded-full ring-[6px] ring-app-secondary-alt inline-block">
                <Avatar name={displayName || user.username} src={user.avatar_url} size={64} status="online" />
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-1">
                  <span className="text-base font-bold text-app-header truncate">
                    {displayName || user.username}
                  </span>
                  {user.is_bot && <BotBadge size="md" />}
                </div>
                <div className="text-tiny text-app-header-secondary">@{user.username}</div>
                {pronouns && <div className="text-tiny text-app-header-secondary mt-0.5">{pronouns}</div>}
              </div>
              <div className="mt-3 border-t border-app-divider/60 pt-3">
                <div className="text-tiny uppercase font-bold tracking-wide text-app-header-secondary mb-1">About Me</div>
                <div className="text-sm text-app-text whitespace-pre-wrap break-words min-h-[40px]">
                  {bio || <span className="text-app-muted italic">Your bio will appear here.</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save bar */}
      {dirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-app-secondary-alt shadow-elevation rounded-lg flex items-center gap-3 pl-4 pr-2 py-2 animate-msg-in">
          <span className="text-sm text-app-interactive-active">Careful — you have unsaved changes!</span>
          <button
            onClick={() => { setDisplayName(user.display_name || ''); setPronouns(user.pronouns || ''); setBio(user.bio || ''); setBannerColor(user.banner_color || '#5865f2'); }}
            className="text-sm text-app-interactive-active hover:underline px-2 py-1.5"
          >Reset</button>
          <button
            disabled={savingProfile}
            onClick={save}
            className="bg-app-green hover:bg-[#1f8d4d] disabled:opacity-60 text-white text-sm font-medium px-4 py-1.5 rounded press-feedback"
          >{savingProfile ? 'Saving…' : 'Save Changes'}</button>
        </div>
      )}
    </>
  );
}

// ----- Appearance -----
function AppearanceSection() {
  const theme = useThemeStore();
  const themeOptions = [
    { id: 'light',      label: 'Light',        sample: ['#f4f6fa', '#e8eaf0'] },
    { id: 'soft-gray',  label: 'Soft Gray',    sample: ['#3c4048', '#2a2d34'] },
    { id: 'dark',       label: 'Dark',         sample: ['#2c2e38', '#16171c'] },
    { id: 'near-black', label: 'Near Black',   sample: ['#10121a', '#000000'] },
    { id: 'system',     label: 'Sync w/ OS',   sample: ['#f4f6fa', '#16171c'] },
    { id: 'custom',     label: 'Custom',       sample: ['#5a78dc', '#22c1c3'] },
  ];

  return (
    <>
      <H1>Appearance</H1>

      <H2>Theme</H2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
        {themeOptions.map((t) => (
          <ThemeCard
            key={t.id}
            label={t.label}
            sample={t.sample}
            active={theme.mode === t.id}
            onClick={() => theme.setMode(t.id)}
          />
        ))}
      </div>

      {theme.mode === 'custom' && (
        <div className="bg-app-900 rounded p-4 mt-3 space-y-4">
          <div>
            <H2>Custom base</H2>
            <div className="flex gap-2">
              {['dark', 'light'].map((b) => (
                <button
                  key={b}
                  onClick={() => theme.setCustomBase(b)}
                  className={
                    'px-3 py-1.5 rounded text-sm font-medium capitalize border ' +
                    (theme.customBase === b
                      ? 'border-app-500 bg-app-500/15 text-app-interactive-active'
                      : 'border-app-divider text-app-interactive hover:text-app-interactive-active')
                  }
                >{b}</button>
              ))}
            </div>
          </div>
          <div>
            <H2>Primary / accent color</H2>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={theme.brand}
                onChange={(e) => theme.setBrand(e.target.value)}
                className="w-12 h-9 rounded cursor-pointer border border-app-divider bg-transparent"
              />
              <input
                type="text"
                value={theme.brand}
                onChange={(e) => theme.setBrand(e.target.value)}
                className="bg-app-secondary-alt rounded px-3 py-1.5 font-mono text-sm text-app-interactive-active outline-none ring-1 ring-app-divider focus:ring-app-500 w-32"
              />
            </div>
          </div>
          <div>
            <H2>Optional gradient (up to 5 colors)</H2>
            <GradientEditor value={theme.gradient} onChange={theme.setGradient} />
          </div>
        </div>
      )}

      <Divider />

      <H2>UI Density</H2>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {['compact', 'default', 'spacious'].map((d) => (
          <button
            key={d}
            onClick={() => theme.setDensity(d)}
            className={
              'py-3 rounded text-sm font-medium capitalize border ' +
              (theme.density === d
                ? 'border-app-500 bg-app-500/15 text-app-interactive-active'
                : 'border-app-divider text-app-interactive hover:text-app-interactive-active')
            }
          >{d}</button>
        ))}
      </div>

      <Divider />

      <H2>Message Display</H2>
      <div className="space-y-2">
        <ChoiceCard
          active={theme.msgMode === 'default'}
          onClick={() => theme.setMsgMode('default')}
          title="Default"
          sub="Roomy spacing, easy to scan."
        />
        <ChoiceCard
          active={theme.msgMode === 'compact'}
          onClick={() => theme.setMsgMode('compact')}
          title="Compact"
          sub="Fit more messages on the screen at once."
        />
      </div>

      <div className="mt-6">
        <button
          onClick={() => theme.reset()}
          className="text-tiny text-app-header-secondary hover:text-app-interactive-active row-hover px-2 py-1 rounded"
        >
          Reset to defaults
        </button>
      </div>
    </>
  );
}

function GradientEditor({ value, onChange }) {
  const list = Array.isArray(value) ? value : [];
  function addColor() {
    if (list.length >= 5) return;
    onChange([...list, '#7a9bff']);
  }
  function setAt(i, color) {
    const next = [...list];
    next[i] = color;
    onChange(next);
  }
  function removeAt(i) {
    const next = [...list];
    next.splice(i, 1);
    onChange(next);
  }
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {list.map((c, i) => (
        <div key={i} className="flex items-center gap-1 bg-app-secondary-alt rounded p-1 ring-1 ring-app-divider">
          <input type="color" value={c} onChange={(e) => setAt(i, e.target.value)}
                 className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
          <button onClick={() => removeAt(i)} className="text-app-muted hover:text-app-red px-1 text-tiny">×</button>
        </div>
      ))}
      {list.length < 5 && (
        <button onClick={addColor}
                className="px-2 py-1 text-tiny text-app-interactive hover:text-app-interactive-active row-hover rounded border border-dashed border-app-divider">
          + Add color
        </button>
      )}
    </div>
  );
}

function ThemeCard({ label, sample = [], active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={
        'h-24 rounded-lg flex items-end p-3 text-sm font-semibold relative ring-2 transition-shadow row-hover ' +
        (active ? 'ring-app-500' : 'ring-transparent hover:ring-app-divider')
      }
      style={{ background: `linear-gradient(135deg, ${sample[0]} 50%, ${sample[1] || sample[0]} 50%)` }}
    >
      {active && (
        <span className="absolute top-2 right-2 w-5 h-5 bg-app-500 rounded-full flex items-center justify-center text-white">
          <CheckIcon size={14} />
        </span>
      )}
      <span className="text-white drop-shadow">{label}</span>
    </button>
  );
}

function ChoiceCard({ active, onClick, title, sub }) {
  return (
    <button
      onClick={onClick}
      className={
        'w-full text-left flex items-center gap-3 bg-app-secondary-alt rounded p-3 ring-1 transition-shadow ' +
        (active ? 'ring-app-500' : 'ring-app-divider hover:ring-app-channel')
      }
    >
      <span className={'w-4 h-4 rounded-full ' + (active ? 'bg-app-500' : 'bg-app-700')} />
      <span className="flex-1">
        <span className="block text-app-interactive-active font-medium">{title}</span>
        <span className="block text-tiny text-app-header-secondary mt-0.5">{sub}</span>
      </span>
    </button>
  );
}

// ----- Notifications -----
function NotificationsSection() {
  const [desktop, setDesktop] = useState(localStorage.getItem('notify_desktop') !== 'off');
  const [unread, setUnread] = useState(localStorage.getItem('notify_unread') !== 'off');
  function persist() {
    localStorage.setItem('notify_desktop', desktop ? 'on' : 'off');
    localStorage.setItem('notify_unread', unread ? 'on' : 'off');
  }
  useEffect(persist, [desktop, unread]);

  return (
    <>
      <H1>Notifications</H1>
      <Toggle label="Enable Desktop Notifications" value={desktop} onChange={setDesktop} hint="Get notified when a new message arrives." />
      <Divider />
      <Toggle label="Enable Unread Message Badge" value={unread} onChange={setUnread} hint="Show a red badge on the app icon when there are unread messages." />
    </>
  );
}

function Toggle({ label, value, onChange, hint }) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-3">
      <div>
        <div className="text-app-interactive-active font-medium">{label}</div>
        {hint && <div className="text-tiny text-app-header-secondary mt-0.5">{hint}</div>}
      </div>
      <span
        className={
          'relative inline-block w-[42px] h-[24px] rounded-full transition-colors ' +
          (value ? 'bg-app-green' : 'bg-app-600')
        }
      >
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <span
          className={
            'absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform ' +
            (value ? 'translate-x-[18px]' : 'translate-x-0')
          }
        />
      </span>
    </label>
  );
}

// ----- Voice & Video -----
function VoiceVideoSection() {
  return (
    <>
      <H1>Voice & Video</H1>
      <H2>Input Device</H2>
      <div className="bg-app-secondary-alt rounded p-3 flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-app-interactive-active">
          <MicIcon size={18} className="text-app-channel" />
          Default — System Default
        </div>
        <ChevronRightIcon size={16} className="text-app-muted" />
      </div>

      <H2>Output Device</H2>
      <div className="bg-app-secondary-alt rounded p-3 flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-app-interactive-active">
          Default — System Default
        </div>
        <ChevronRightIcon size={16} className="text-app-muted" />
      </div>

      <div className="bg-app-900 rounded p-4 text-app-header-secondary text-sm">
        Device selection is handled inside the LiveKit room controls when you join a voice/video channel.
      </div>
    </>
  );
}

// ----- Modal primitives -----
function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-app-800 rounded-md w-full max-w-md shadow-elevation overflow-hidden animate-modal-in">
        <div className="px-6 pt-5 pb-3 flex items-start justify-between border-b border-app-divider">
          <h3 className="text-lg font-bold text-app-header">{title}</h3>
          <button onClick={onClose} className="text-app-interactive hover:text-app-interactive-active p-1 -mr-2 -mt-1 press-feedback">
            <CloseIcon size={20} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
function ModalFooter({ onCancel, onConfirm, confirmLabel, confirmDisabled }) {
  return (
    <div className="bg-app-900 -mx-6 -mb-5 mt-5 px-6 py-4 flex justify-end gap-2">
      <button onClick={onCancel} className="text-app-interactive-active text-sm hover:underline px-3 py-2">Cancel</button>
      <button
        disabled={confirmDisabled}
        onClick={onConfirm}
        className="bg-app-500 hover:bg-app-400 disabled:opacity-60 text-white text-sm font-medium rounded px-5 py-2 press-feedback"
      >
        {confirmLabel}
      </button>
    </div>
  );
}
function LabeledInput({ label, value, onChange, type = 'text', required, minLength }) {
  return (
    <div>
      <label className="block text-tiny uppercase font-bold tracking-wide text-app-header-secondary mb-1.5">{label}</label>
      <input
        type={type}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-app-950 border border-transparent focus:border-app-500 outline-none rounded px-3 py-2.5 text-app-interactive-active"
      />
    </div>
  );
}
