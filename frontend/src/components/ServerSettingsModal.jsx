import { useEffect, useState } from 'react';
import api from '../services/api';
import { useChatStore } from '../store/chat';
import { useAuthStore } from '../store/auth';
import Avatar from './Avatar';
import { classNames } from '../lib/utils';
import {
  CloseIcon, CogIcon, ShieldIcon, UsersIcon, TrashIcon, PlusIcon,
  InvitePeopleIcon, KeyIcon, BellIcon,
} from './icons';

const TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'roles',     label: 'Roles' },
  { id: 'members',   label: 'Members' },
  { id: 'invites',   label: 'Invites' },
  { id: 'automod',   label: 'AutoMod' },
  { id: 'audit',     label: 'Audit Log' },
];

function H1({ children }) {
  return <h1 className="text-xl font-bold text-app-header mb-5 tracking-tight">{children}</h1>;
}
function H2({ children }) {
  return <h2 className="text-tiny uppercase font-bold tracking-wide text-app-header-secondary mt-4 mb-2">{children}</h2>;
}

export default function ServerSettingsModal({ server, onClose }) {
  const [tab, setTab] = useState('overview');
  const me = useAuthStore((s) => s.user);
  const members = useChatStore((s) => s.members);
  const myRow = members.find((m) => m.id === me?.id);
  const canManage = ['owner', 'admin'].includes(myRow?.role) || me?.is_admin;

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!canManage) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
        <div className="bg-app-800 rounded-md p-6 max-w-sm">
          <H1>No access</H1>
          <p className="text-app-header-secondary text-sm">Only server admins can open server settings.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-app-500 hover:bg-app-400 rounded text-white text-sm font-medium">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex bg-app-800 text-app-text animate-fade-in">
      <aside className="w-[218px] sm:w-[260px] bg-app-900 flex-shrink-0 overflow-y-auto scrollbar-thin">
        <div className="px-4 py-[60px] w-full max-w-[220px]">
          <div className="text-tiny uppercase font-bold tracking-wide text-app-header-secondary px-1 mb-1.5">
            {server?.name || 'Server'}
          </div>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={classNames(
                'w-full text-left px-2.5 py-1.5 rounded text-[15px] font-medium row-hover mt-0.5',
                tab === t.id
                  ? 'bg-[rgba(78,80,88,0.6)] text-app-interactive-active'
                  : 'text-app-interactive hover:bg-[rgba(78,80,88,0.3)] hover:text-app-interactive-hover'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-6 sm:px-10 py-[60px] min-w-0">
        <div className="max-w-3xl">
          {tab === 'overview'&& <OverviewTab server={server} />}
          {tab === 'roles'   && <RolesTab    server={server} />}
          {tab === 'members' && <MembersTab  server={server} />}
          {tab === 'invites' && <InvitesTab  server={server} />}
          {tab === 'automod' && <AutoModTab  server={server} />}
          {tab === 'audit'   && <AuditTab    server={server} />}
        </div>
      </main>

      <div className="w-[60px] sm:w-[100px] flex-shrink-0 pt-[60px]">
        <div className="flex flex-col items-start">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border-2 border-app-interactive/40 hover:border-app-interactive-active text-app-interactive hover:text-app-interactive-active row-hover flex items-center justify-center press-feedback"
            aria-label="Close settings"
          >
            <CloseIcon size={18} />
          </button>
          <span className="text-tiny font-bold text-app-interactive mt-1.5 ml-2">ESC</span>
        </div>
      </div>
    </div>
  );
}

// ───── tabs ────────────────────────────────────────────────────────

function OverviewTab({ server }) {
  return (
    <>
      <H1>Server Overview</H1>
      <div className="bg-app-900 rounded-md p-4 ring-1 ring-app-divider">
        <div className="text-sm text-app-header-secondary">Name</div>
        <div className="text-app-interactive-active text-lg font-semibold">{server?.name}</div>
        <div className="text-tiny text-app-header-secondary mt-2">Invite code</div>
        <code className="font-mono text-app-link select-all">{server?.invite_code}</code>
      </div>
      <p className="text-tiny text-app-header-secondary mt-4">
        Editing the server name, description, banner, rules, and welcome screen are coming soon. The data fields are already in the schema (description, banner_url, rules, welcome_message, verification_level, is_community).
      </p>
    </>
  );
}

function RolesTab({ server }) {
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#646770');
  const [permBits, setPermBits] = useState(0n);

  async function refresh() {
    const [r1, r2] = await Promise.all([
      api.get(`/roles/server/${server.id}`),
      api.get(`/servers/${server.id}/members`),
    ]);
    setRoles(r1.data.roles);
    setMembers(r2.data.members);
  }

  useEffect(() => { refresh().catch(() => {}); }, [server?.id]);

  async function create() {
    if (!name.trim()) return;
    await api.post(`/roles/server/${server.id}`, {
      name, color, permissions: permBits.toString(), hoist: false, mentionable: false,
    });
    setName('');
    setColor('#646770');
    setPermBits(0n);
    refresh();
  }
  async function del(role) {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    await api.delete(`/roles/${role.id}`);
    refresh();
    if (selected?.id === role.id) setSelected(null);
  }
  async function save(role) {
    await api.patch(`/roles/${role.id}`, {
      name: role.name, color: role.color, permissions: role.permissions,
      hoist: role.hoist, mentionable: role.mentionable, position: role.position,
    });
    refresh();
  }

  return (
    <>
      <H1>Roles</H1>
      <p className="text-tiny text-app-header-secondary mb-4">
        Use roles to group members, hoist them in the member list, and grant permissions.
      </p>

      <div className="bg-app-900 rounded-md p-3 ring-1 ring-app-divider mb-4">
        <H2>Create new role</H2>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Role name"
            className="bg-app-secondary-alt rounded px-3 py-1.5 text-sm text-app-interactive-active outline-none ring-1 ring-app-divider focus:ring-app-500"
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-9 h-9 rounded cursor-pointer border border-app-divider bg-transparent"
          />
          <button onClick={create} className="px-3 py-1.5 bg-app-500 hover:bg-app-400 text-white text-sm font-medium rounded press-feedback">
            Create role
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {roles.map((r) => (
          <div key={r.id} className="bg-app-900 rounded-md p-3 ring-1 ring-app-divider flex items-center gap-3">
            <span className="w-3 h-3 rounded-full" style={{ background: r.color || '#9aa0a8' }} />
            <span className="text-sm font-semibold text-app-interactive-active">{r.name}</span>
            {r.managed && <span className="text-tiny text-app-yellow">managed</span>}
            <div className="flex-1" />
            <button
              onClick={() => del(r)}
              className="text-app-interactive hover:text-app-red row-hover p-1.5 rounded"
              title="Delete role"
            >
              <TrashIcon size={16} />
            </button>
          </div>
        ))}
        {roles.length === 0 && (
          <div className="text-tiny text-app-muted py-3">No roles yet.</div>
        )}
      </div>

      <H2>Assign roles to members</H2>
      <div className="space-y-1">
        {members.map((m) => (
          <MemberRoleRow key={m.id} member={m} server={server} roles={roles} onChange={refresh} />
        ))}
      </div>
    </>
  );
}

function MemberRoleRow({ member, server, roles, onChange }) {
  const [my, setMy] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch their roles only once when expanded — keep things light.
  const [expanded, setExpanded] = useState(false);

  async function loadMine() {
    setLoading(true);
    try {
      const { data } = await api.get(`/roles/server/${server.id}`);
      // We don't have a /members/:id/roles endpoint — show all roles with toggles
      // and rely on assign/unassign being idempotent.
      setMy(data.roles.map((r) => r.id));
    } finally { setLoading(false); }
  }

  async function assign(roleId) {
    try { await api.post(`/roles/server/${server.id}/member/${member.id}/role/${roleId}`); onChange(); }
    catch (_) {}
  }
  async function unassign(roleId) {
    try { await api.delete(`/roles/server/${server.id}/member/${member.id}/role/${roleId}`); onChange(); }
    catch (_) {}
  }

  return (
    <div className="bg-app-secondary-alt rounded p-2">
      <button
        onClick={() => { const next = !expanded; setExpanded(next); if (next) loadMine(); }}
        className="w-full flex items-center gap-3 text-left"
      >
        <Avatar name={member.display_name || member.username} src={member.avatar_url} size={28} />
        <span className="text-sm font-semibold text-app-interactive-active">{member.display_name || member.username}</span>
        <span className="text-tiny text-app-header-secondary">@{member.username}</span>
        <span className="ml-auto text-tiny text-app-channel">{expanded ? 'hide' : 'manage'}</span>
      </button>
      {expanded && (
        <div className="mt-2 flex flex-wrap gap-1">
          {roles.map((r) => (
            <div key={r.id} className="flex items-center gap-1 text-tiny">
              <span className="px-2 py-0.5 rounded border" style={{ borderColor: r.color || '#3f4147' }}>{r.name}</span>
              <button onClick={() => assign(r.id)}   className="text-app-link hover:underline">+</button>
              <button onClick={() => unassign(r.id)} className="text-app-red hover:underline">−</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MembersTab({ server }) {
  const [members, setMembers] = useState([]);
  const [bans, setBans] = useState([]);
  const [q, setQ] = useState('');
  const [reason, setReason] = useState('');

  async function refresh() {
    const [r1, r2] = await Promise.all([
      api.get(`/servers/${server.id}/members`),
      api.get(`/moderation/server/${server.id}/bans`),
    ]);
    setMembers(r1.data.members);
    setBans(r2.data.bans || []);
  }
  useEffect(() => { refresh().catch(() => {}); }, [server?.id]);

  async function act(action, userId, body) {
    try { await api.post(`/moderation/server/${server.id}/${action}/${userId}`, body || {}); await refresh(); }
    catch (e) { alert(e?.response?.data?.error || 'Failed'); }
  }

  const list = members.filter((m) => {
    if (!q.trim()) return true;
    const hay = `${m.username} ${m.display_name || ''}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <>
      <H1>Members <span className="text-tiny text-app-header-secondary font-normal">— {members.length} total</span></H1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search members"
        className="bg-app-950 outline-none rounded px-3 py-2 w-full max-w-sm text-app-interactive-active focus:ring-2 focus:ring-app-500"
      />

      <div className="mt-4 space-y-1">
        {list.map((m) => (
          <div key={m.id} className="bg-app-900 rounded p-3 flex items-center gap-3">
            <Avatar name={m.display_name || m.username} src={m.avatar_url} size={32} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-app-interactive-active truncate">
                {m.display_name || m.username}
                <span className="ml-2 text-tiny text-app-header-secondary">@{m.username}</span>
              </div>
              <div className="text-tiny text-app-header-secondary">role: <span className="text-app-interactive-active capitalize">{m.role || 'member'}</span></div>
            </div>
            {m.role !== 'owner' && (
              <div className="flex gap-1">
                <button
                  onClick={() => act('timeout', m.id, { minutes: 10, reason: reason || undefined })}
                  className="px-2 py-1 text-tiny rounded bg-app-yellow/15 text-app-yellow hover:bg-app-yellow/25"
                  title="Timeout 10m"
                >Timeout</button>
                <button
                  onClick={() => { if (confirm(`Kick ${m.username}?`)) act('kick', m.id, { reason: reason || undefined }); }}
                  className="px-2 py-1 text-tiny rounded bg-app-secondary-alt text-app-interactive hover:text-app-red"
                >Kick</button>
                <button
                  onClick={() => { if (confirm(`Ban ${m.username}?`)) act('ban', m.id, { reason: reason || undefined }); }}
                  className="px-2 py-1 text-tiny rounded bg-app-red/15 text-app-red hover:bg-app-red/25"
                >Ban</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4">
        <label className="text-tiny uppercase font-bold tracking-wide text-app-header-secondary">Default reason (optional)</label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason attached to the next mod action"
          className="bg-app-secondary-alt outline-none rounded px-3 py-2 w-full text-app-interactive-active mt-1"
        />
      </div>

      <H2>Banned</H2>
      <div className="space-y-1">
        {bans.length === 0 && <div className="text-tiny text-app-muted py-1">No active bans.</div>}
        {bans.map((b) => (
          <div key={b.id} className="bg-app-900 rounded p-2 flex items-center gap-3">
            <Avatar name={b.display_name || b.username} src={b.avatar_url} size={24} />
            <span className="text-sm text-app-interactive-active">{b.display_name || b.username}</span>
            <span className="text-tiny text-app-header-secondary flex-1 truncate">{b.reason || ''}</span>
            <button
              onClick={() => act('unban', b.user_id)}
              className="px-2 py-1 text-tiny rounded bg-app-secondary-alt text-app-interactive hover:text-app-interactive-active"
            >Unban</button>
          </div>
        ))}
      </div>
    </>
  );
}

function InvitesTab({ server }) {
  const [invites, setInvites] = useState([]);
  const [code, setCode] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expHours, setExpHours] = useState('');
  const [isTemp, setIsTemp] = useState(false);

  async function refresh() {
    const { data } = await api.get(`/invites/server/${server.id}`);
    setInvites(data.invites);
  }
  useEffect(() => { refresh().catch(() => {}); }, [server?.id]);

  async function create() {
    const body = {
      custom_code: code || undefined,
      max_uses: maxUses ? parseInt(maxUses, 10) : undefined,
      expires_in_seconds: expHours ? parseInt(expHours, 10) * 3600 : undefined,
      is_temporary: isTemp,
    };
    try { await api.post(`/invites/server/${server.id}`, body); }
    catch (e) { alert(e?.response?.data?.error || 'Failed'); return; }
    setCode(''); setMaxUses(''); setExpHours(''); setIsTemp(false);
    refresh();
  }

  async function del(id) {
    if (!confirm('Delete this invite?')) return;
    await api.delete(`/invites/${id}`);
    refresh();
  }

  return (
    <>
      <H1>Invites</H1>

      <div className="bg-app-900 rounded p-3 ring-1 ring-app-divider mb-4">
        <H2>Create new invite</H2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Custom code (optional)"
                 className="bg-app-secondary-alt rounded px-3 py-1.5 text-sm text-app-interactive-active outline-none ring-1 ring-app-divider focus:ring-app-500" />
          <input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} type="number" placeholder="Max uses"
                 className="bg-app-secondary-alt rounded px-3 py-1.5 text-sm text-app-interactive-active outline-none ring-1 ring-app-divider focus:ring-app-500" />
          <input value={expHours} onChange={(e) => setExpHours(e.target.value)} type="number" placeholder="Expires in (hours)"
                 className="bg-app-secondary-alt rounded px-3 py-1.5 text-sm text-app-interactive-active outline-none ring-1 ring-app-divider focus:ring-app-500" />
          <label className="flex items-center gap-2 text-tiny text-app-header-secondary">
            <input type="checkbox" checked={isTemp} onChange={(e) => setIsTemp(e.target.checked)} />
            Temporary membership
          </label>
        </div>
        <button onClick={create} className="mt-3 px-3 py-1.5 bg-app-500 hover:bg-app-400 text-white text-sm font-medium rounded press-feedback">
          Create invite
        </button>
      </div>

      <div className="space-y-2">
        {invites.length === 0 && <div className="text-tiny text-app-muted py-2">No invites yet.</div>}
        {invites.map((i) => {
          const isExpired = i.expires_at && new Date(i.expires_at) < new Date();
          const isMaxed = i.max_uses != null && i.uses >= i.max_uses;
          return (
            <div key={i.id} className="bg-app-900 rounded p-3 ring-1 ring-app-divider flex items-center gap-3">
              <code className="font-mono text-app-link select-all">{i.code}</code>
              <div className="text-tiny text-app-header-secondary">
                {i.uses} use{i.uses === 1 ? '' : 's'}
                {i.max_uses != null && ` / ${i.max_uses}`}
                {i.is_temporary && ' • temporary'}
                {i.expires_at && ` • expires ${new Date(i.expires_at).toLocaleString()}`}
                {(isExpired || isMaxed) && <span className="ml-1 text-app-yellow">(inactive)</span>}
              </div>
              <div className="flex-1" />
              <button
                onClick={() => navigator.clipboard?.writeText?.(i.code)}
                className="px-2 py-1 text-tiny rounded bg-app-secondary-alt text-app-interactive hover:text-app-interactive-active"
              >Copy</button>
              <button
                onClick={() => del(i.id)}
                className="p-1.5 text-app-interactive hover:text-app-red row-hover rounded"
              >
                <TrashIcon size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function AutoModTab({ server }) {
  const [rules, setRules] = useState([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('keyword');
  const [keywords, setKeywords] = useState('');
  const [threshold, setThreshold] = useState('5');

  async function refresh() {
    const { data } = await api.get(`/moderation/server/${server.id}/automod`);
    setRules(data.rules);
  }
  useEffect(() => { refresh().catch(() => {}); }, [server?.id]);

  async function create() {
    const config = type === 'keyword'
      ? { keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean) }
      : { threshold: type === 'caps' ? parseFloat(threshold) : parseInt(threshold, 10) };
    try {
      await api.post(`/moderation/server/${server.id}/automod`, {
        name: name || `Rule ${rules.length + 1}`, rule_type: type, config, action: 'block',
      });
      setName(''); setKeywords('');
      refresh();
    } catch (e) { alert(e?.response?.data?.error || 'Failed'); }
  }
  async function toggle(rule) {
    await api.patch(`/moderation/automod/${rule.id}`, { enabled: !rule.enabled });
    refresh();
  }
  async function del(id) {
    if (!confirm('Delete this rule?')) return;
    await api.delete(`/moderation/automod/${id}`);
    refresh();
  }

  return (
    <>
      <H1>AutoMod</H1>
      <p className="text-tiny text-app-header-secondary mb-4">
        Rules run on every outgoing message in this server. Matched messages are blocked before they're sent.
      </p>

      <div className="bg-app-900 rounded p-3 ring-1 ring-app-divider mb-4">
        <H2>Create rule</H2>
        <div className="grid grid-cols-2 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rule name"
                 className="bg-app-secondary-alt rounded px-3 py-1.5 text-sm text-app-interactive-active outline-none ring-1 ring-app-divider focus:ring-app-500" />
          <select value={type} onChange={(e) => setType(e.target.value)}
                  className="bg-app-secondary-alt rounded px-3 py-1.5 text-sm text-app-interactive-active outline-none ring-1 ring-app-divider focus:ring-app-500">
            <option value="keyword">Keyword filter</option>
            <option value="spam">Spam (repetition)</option>
            <option value="mention_spam">Mention spam</option>
            <option value="caps">Excessive caps</option>
          </select>
          {type === 'keyword' ? (
            <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="word1, word2, …"
                   className="col-span-2 bg-app-secondary-alt rounded px-3 py-1.5 text-sm text-app-interactive-active outline-none ring-1 ring-app-divider focus:ring-app-500" />
          ) : (
            <input value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder={type === 'caps' ? 'Threshold 0–1 (e.g. 0.7)' : 'Threshold (count)'}
                   className="col-span-2 bg-app-secondary-alt rounded px-3 py-1.5 text-sm text-app-interactive-active outline-none ring-1 ring-app-divider focus:ring-app-500" />
          )}
        </div>
        <button onClick={create} className="mt-3 px-3 py-1.5 bg-app-500 hover:bg-app-400 text-white text-sm font-medium rounded press-feedback">
          Create rule
        </button>
      </div>

      <div className="space-y-2">
        {rules.length === 0 && <div className="text-tiny text-app-muted">No automod rules yet.</div>}
        {rules.map((r) => (
          <div key={r.id} className="bg-app-900 rounded p-3 ring-1 ring-app-divider flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-app-interactive-active">{r.name}</div>
              <div className="text-tiny text-app-header-secondary">
                {r.rule_type} • action: {r.action} • {r.enabled ? 'enabled' : 'disabled'}
              </div>
            </div>
            <button onClick={() => toggle(r)} className="px-2 py-1 text-tiny rounded bg-app-secondary-alt text-app-interactive hover:text-app-interactive-active">
              {r.enabled ? 'Disable' : 'Enable'}
            </button>
            <button onClick={() => del(r.id)} className="p-1.5 text-app-interactive hover:text-app-red row-hover rounded">
              <TrashIcon size={16} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

function AuditTab({ server }) {
  const [entries, setEntries] = useState([]);
  useEffect(() => {
    api.get(`/moderation/server/${server.id}/audit-log`)
      .then((r) => setEntries(r.data.entries || []))
      .catch(() => {});
  }, [server?.id]);

  return (
    <>
      <H1>Audit Log</H1>
      <div className="space-y-2">
        {entries.length === 0 && <div className="text-tiny text-app-muted">No actions recorded yet.</div>}
        {entries.map((e) => (
          <div key={e.id} className="bg-app-900 rounded p-3 ring-1 ring-app-divider">
            <div className="text-sm text-app-interactive-active">
              {e.actor_username || 'system'} <span className="text-app-channel">→</span>{' '}
              <code className="font-mono text-app-link">{e.action}</code>
            </div>
            <div className="text-tiny text-app-header-secondary">{new Date(e.created_at).toLocaleString()}</div>
            {e.details && (
              <pre className="mt-1 text-tiny text-app-text bg-app-secondary-alt rounded p-2 overflow-x-auto">{JSON.stringify(e.details, null, 2)}</pre>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
