// Resolve the API + socket base URL once.
// Priority:
//   1. VITE_API_URL / VITE_SOCKET_URL if set (build-time .env)
//   2. Derive from the current page origin's hostname on port 4000
//      — this lets you open the frontend from your phone at
//      http://192.168.x.x:5173 and have it talk to the backend at
//      http://192.168.x.x:4000 without any extra config.
//   3. Final fallback: http://localhost:4000

function deriveFromLocation() {
  if (typeof window === 'undefined') return 'http://localhost:4000';
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:4000`;
}

export const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || deriveFromLocation();

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL?.replace(/\/$/, '') || API_URL;
