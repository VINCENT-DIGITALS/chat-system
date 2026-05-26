import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useBrandingStore } from '../../store/branding';

export default function Branding() {
  const refetch = useBrandingStore((s) => s.fetch);
  const [appName, setAppName] = useState('');
  const [appShort, setAppShort] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [err, setErr] = useState(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const { data } = await api.get('/admin/settings');
      const n = data.settings.app_name;
      const s = data.settings.app_short;
      setAppName(typeof n === 'string' ? n : 'Chat System');
      setAppShort(typeof s === 'string' ? s : 'CS');
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true); setErr(null);
    try {
      await api.put('/admin/settings', {
        app_name: appName || 'Chat System',
        app_short: (appShort || 'CS').slice(0, 4).toUpperCase(),
      });
      setSavedAt(new Date());
      await refetch();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally { setSaving(false); }
  }

  if (loading) return <div className="text-app-header-secondary">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-xl sm:text-2xl font-bold text-app-header tracking-tight">Branding</h1>
      <p className="text-app-header-secondary text-sm">
        Change the app name shown in the browser tab, login/register pages, sidebars, and welcome screens.
      </p>

      <div className="bg-app-900 rounded-lg p-5 space-y-5 ring-1 ring-black/20">
        <div>
          <label className="block text-tiny uppercase font-bold tracking-wide text-app-header-secondary mb-1.5">
            App Name
          </label>
          <input
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            maxLength={50}
            className="w-full bg-app-950 outline-none rounded px-3 py-2.5 text-app-interactive-active focus:ring-2 focus:ring-app-500"
            placeholder="Chat System"
          />
          <div className="text-tiny text-app-muted mt-1">Shown in window title, welcome screen, and login page.</div>
        </div>

        <div>
          <label className="block text-tiny uppercase font-bold tracking-wide text-app-header-secondary mb-1.5">
            Short Code (up to 4 letters)
          </label>
          <input
            value={appShort}
            onChange={(e) => setAppShort(e.target.value.slice(0, 4).toUpperCase())}
            maxLength={4}
            className="w-32 bg-app-950 outline-none rounded px-3 py-2.5 text-app-interactive-active font-extrabold tracking-widest text-center focus:ring-2 focus:ring-app-500"
            placeholder="CS"
          />
          <div className="text-tiny text-app-muted mt-1">Used as the brand badge in the server sidebar and on auth pages.</div>
        </div>

        {/* Preview */}
        <div className="border-t border-app-divider pt-4">
          <div className="text-tiny uppercase font-bold tracking-wide text-app-header-secondary mb-2">Preview</div>
          <div className="flex items-center gap-3 bg-app-secondary-alt rounded p-3">
            <div className="w-12 h-12 rounded-2xl bg-app-500 text-white flex items-center justify-center font-extrabold tracking-wider">
              {appShort || 'CS'}
            </div>
            <div className="text-app-interactive-active font-bold text-lg">
              Welcome to {appName || 'Chat System'}
            </div>
          </div>
        </div>

        {err && <div className="text-app-red text-sm bg-app-red/15 rounded px-3 py-2">{err}</div>}

        <div className="flex items-center justify-between">
          <div className="text-xs text-app-header-secondary">
            {savedAt && `Saved ${savedAt.toLocaleTimeString()}`}
          </div>
          <button
            disabled={saving}
            onClick={save}
            className="bg-app-500 hover:bg-app-400 disabled:opacity-60 text-white px-5 py-2 rounded font-medium press-feedback"
          >
            {saving ? 'Saving…' : 'Save Branding'}
          </button>
        </div>
      </div>
    </div>
  );
}
