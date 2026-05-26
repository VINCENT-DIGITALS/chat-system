import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function Maintenance() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [message, setMessage] = useState('');
  const [err, setErr] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const { data } = await api.get('/admin/settings');
      const mm = data.settings.maintenance_mode;
      const msg = data.settings.maintenance_message;
      setMaintenance(mm === true || mm === 'true');
      setMessage(typeof msg === 'string' ? msg : '');
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true); setErr(null);
    try {
      await api.put('/admin/settings', {
        maintenance_mode: !!maintenance,
        maintenance_message: message || 'Maintenance in progress',
      });
      setSavedAt(new Date());
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally { setSaving(false); }
  }

  if (loading) return <div className="text-app-muted">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-xl sm:text-2xl font-bold text-white">Maintenance</h1>
      <p className="text-app-muted text-sm">
        When maintenance mode is on, non-admin users are locked out of the chat APIs
        and shown the message below. Admins keep full access.
      </p>

      <div className="bg-app-900 rounded-lg p-5 space-y-5 ring-1 ring-black/20">
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <div className="text-white font-semibold">Maintenance mode</div>
            <div className="text-xs text-app-muted">
              {maintenance ? 'ON — chat is locked down for users.' : 'OFF — chat is open.'}
            </div>
          </div>
          {/* iOS-style toggle */}
          <span
            className={
              'relative inline-block w-12 h-7 rounded-full transition-colors ' +
              (maintenance ? 'bg-app-green' : 'bg-app-700')
            }
          >
            <input
              type="checkbox"
              checked={maintenance}
              onChange={(e) => setMaintenance(e.target.checked)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <span
              className={
                'absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ' +
                (maintenance ? 'translate-x-5' : 'translate-x-0')
              }
            />
          </span>
        </label>

        <div>
          <label className="block text-xs uppercase tracking-wide font-semibold text-app-muted mb-1.5">
            User-facing message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full bg-app-950 outline-none rounded px-3 py-2 text-white focus:ring-2 focus:ring-app-500 resize-none"
          />
        </div>

        {err && <div className="text-app-red text-sm bg-app-red/15 rounded px-3 py-2">{err}</div>}

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-app-muted">
            {savedAt && `Saved ${savedAt.toLocaleTimeString()}`}
          </div>
          <button
            disabled={saving}
            onClick={save}
            className="bg-app-500 hover:bg-app-400 disabled:opacity-60 text-white px-4 py-2 rounded font-medium"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
