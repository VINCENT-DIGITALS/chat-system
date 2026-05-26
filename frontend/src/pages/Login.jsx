import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useBrandingStore } from '../store/branding';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading, error } = useAuthStore();
  const brand = useBrandingStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setLocalError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (e) {
      setLocalError(e.message);
    }
  }

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center bg-app-950 p-4"
      style={{
        backgroundImage:
          'radial-gradient(circle at 20% 20%, rgba(88,101,242,0.18), transparent 40%), radial-gradient(circle at 80% 60%, rgba(35,165,90,0.15), transparent 40%), radial-gradient(circle at 50% 100%, rgba(240,178,50,0.08), transparent 40%)',
      }}
    >
      <div className="w-full max-w-md bg-[#313338] rounded-md shadow-elevation-high p-6 sm:p-8 animate-modal-in">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-app-500 text-white flex items-center justify-center font-extrabold tracking-wider">
            {brand.app_short || 'CS'}
          </div>
          <h1 className="text-2xl font-bold text-app-header mt-4 tracking-tight">Welcome back!</h1>
          <p className="text-app-header-secondary mt-0.5 text-sm">Log in to {brand.app_name}</p>
          <p className="text-app-header-secondary mt-1 text-sm">We're so excited to see you again.</p>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-5">
          <div>
            <label className="block text-eyebrow uppercase font-bold text-app-header-secondary mb-2">
              Email <span className="text-app-red">*</span>
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1e1f22] border border-transparent focus:border-app-500 outline-none rounded px-3 py-2.5 text-app-interactive-active transition-colors"
            />
          </div>
          <div>
            <label className="block text-eyebrow uppercase font-bold text-app-header-secondary mb-2">
              Password <span className="text-app-red">*</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1e1f22] border border-transparent focus:border-app-500 outline-none rounded px-3 py-2.5 text-app-interactive-active transition-colors"
            />
            <button
              type="button"
              onClick={() => alert('Password reset isn’t set up yet — ask an admin to reset your password from the Users panel.')}
              className="mt-1 text-tiny text-app-link hover:underline"
            >
              Forgot your password?
            </button>
          </div>
          {(localError || error) && (
            <div className="bg-app-red/15 border border-app-red/30 text-app-red text-sm rounded px-3 py-2">
              {localError || error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-app-500 hover:bg-app-400 disabled:opacity-60 text-white font-medium py-2.5 rounded transition-colors press-feedback"
          >
            {loading ? 'Logging in…' : 'Log In'}
          </button>
          <div className="text-sm text-app-header-secondary">
            Need an account?{' '}
            <Link to="/register" className="text-app-link hover:underline">Register</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
