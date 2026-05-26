import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../services/endpoints';

const baseURL = API_URL;

export default function MaintenanceBanner() {
  const [state, setState] = useState({ maintenance: false, message: '' });

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const { data } = await axios.get(`${baseURL}/api/system/status`);
        if (alive) setState(data);
      } catch (_) { /* ignore */ }
    }
    poll();
    const t = setInterval(poll, 15000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (!state.maintenance) return null;
  return (
    <div className="bg-app-yellow text-black text-xs sm:text-sm font-medium text-center py-1.5 px-3 flex items-center justify-center gap-2 shrink-0">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2L1 21h22L12 2zm0 6l7.5 13H4.5L12 8zm-1 4v4h2v-4h-2zm0 5v2h2v-2h-2z" />
      </svg>
      <span><span className="font-bold">Maintenance:</span> {state.message}</span>
    </div>
  );
}
