import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth';
import { MenuIcon, CloseIcon, LogoutIcon, ShieldIcon } from '../../components/icons';

const NAV = [
  { to: '/admin',            label: 'Dashboard',  end: true },
  { to: '/admin/users',      label: 'Users' },
  { to: '/admin/bots',       label: 'Bots' },
  { to: '/admin/servers',    label: 'Servers' },
  { to: '/admin/branding',   label: 'Branding' },
  { to: '/admin/maintenance',label: 'Maintenance' },
  { to: '/admin/audit',      label: 'Audit Log' },
];

export default function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (user && !user.is_admin) navigate('/', { replace: true });
  }, [user, navigate]);

  if (!user) return null;
  if (!user.is_admin) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-app-950 text-app-header-secondary">
        Admin access required.
      </div>
    );
  }

  const linkClass = ({ isActive }) =>
    'block px-3 py-2 rounded text-sm row-hover press-feedback ' +
    (isActive
      ? 'bg-app-500 text-white'
      : 'text-app-interactive hover:bg-app-700 hover:text-app-interactive-active');

  function NavList({ onPick }) {
    return (
      <nav className="space-y-1">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={linkClass} onClick={onPick}>
            {n.label}
          </NavLink>
        ))}
      </nav>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row bg-app-950 text-app-text overflow-hidden">
      {/* Mobile topbar */}
      <header className="md:hidden flex items-center px-3 h-12 bg-app-900 shadow-channel-header shrink-0">
        <button
          onClick={() => setNavOpen(true)}
          className="p-2 -ml-1 text-app-interactive hover:text-app-interactive-active row-hover rounded press-feedback"
          aria-label="Open admin menu"
        >
          <MenuIcon size={20} />
        </button>
        <ShieldIcon size={16} className="ml-2 text-app-link" />
        <div className="ml-2 font-semibold text-app-header tracking-tight">Admin Panel</div>
        <button
          onClick={() => navigate('/')}
          className="ml-auto text-app-interactive hover:text-app-interactive-active text-sm px-2 row-hover press-feedback"
        >
          Back
        </button>
      </header>

      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-60 bg-app-900 flex-col p-3 shrink-0">
        <div className="px-2 py-3 border-b border-app-divider mb-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-app-link/15 text-app-link flex items-center justify-center">
            <ShieldIcon size={16} />
          </div>
          <div>
            <div className="text-tiny uppercase tracking-widest text-app-header-secondary">Admin Panel</div>
            <div className="text-app-interactive-active font-semibold leading-tight text-sm">{user.username}</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin"><NavList /></div>
        <button
          onClick={() => navigate('/')}
          className="mt-3 flex items-center gap-2 text-xs text-app-header-secondary hover:text-app-interactive-active px-3 py-2 row-hover press-feedback rounded"
        >
          <LogoutIcon size={14} /> Back to chat
        </button>
      </aside>

      {/* Mobile slide-over nav */}
      {navOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-fade-in">
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            className="absolute inset-0 bg-black/70"
            aria-label="Close menu"
          />
          <aside className="relative w-64 bg-app-900 h-full p-3 flex flex-col shadow-elevation animate-modal-in">
            <div className="flex items-center justify-between px-1">
              <div className="text-app-interactive-active font-semibold">Admin</div>
              <button onClick={() => setNavOpen(false)} className="p-2 text-app-interactive hover:text-app-interactive-active press-feedback rounded">
                <CloseIcon size={20} />
              </button>
            </div>
            <div className="mt-3 flex-1 overflow-y-auto scrollbar-thin">
              <NavList onPick={() => setNavOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-app-800">
        <Outlet />
      </main>
    </div>
  );
}
