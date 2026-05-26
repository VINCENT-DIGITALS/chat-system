import { create } from 'zustand';
import api from '../services/api';

// Theme + appearance store.
// Persists to localStorage and applies values to <html data-...> attributes
// so that CSS variables in index.css drive the entire UI.

const STORAGE_KEY = 'app_theme_settings_v1';

const DEFAULTS = {
  mode: 'dark',          // 'light' | 'soft-gray' | 'dark' | 'near-black' | 'system' | 'custom'
  density: 'default',    // 'compact' | 'default' | 'spacious'
  msgMode: 'default',    // 'default' | 'compact'
  // Custom-theme controls (applied only when mode === 'custom')
  customBase: 'dark',    // 'light' | 'dark'
  brand: '#5a78dc',      // accent / primary
  gradient: [],          // up to 5 hex colors for an optional background gradient
};

function loadInitial() {
  if (typeof localStorage === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function persist(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        mode: state.mode,
        density: state.density,
        msgMode: state.msgMode,
        customBase: state.customBase,
        brand: state.brand,
        gradient: state.gradient,
      })
    );
  } catch {
    /* ignore quota errors */
  }
}

function hexToRgbTriplet(hex) {
  if (!hex) return null;
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function shade(hex, amount) {
  const t = hexToRgbTriplet(hex);
  if (!t) return null;
  const [r, g, b] = t.split(' ').map(Number);
  const adj = (n) => Math.max(0, Math.min(255, Math.round(n + amount)));
  return `${adj(r)} ${adj(g)} ${adj(b)}`;
}

function effectiveMode(state) {
  if (state.mode !== 'system') return state.mode;
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyToDOM(state) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // For 'custom', flip the data-theme to the user's chosen base.
  const themeAttr =
    state.mode === 'custom'
      ? state.customBase === 'light' ? 'light' : 'dark'
      : effectiveMode(state);
  root.setAttribute('data-theme', themeAttr);
  root.setAttribute('data-density', state.density);
  root.setAttribute('data-msg-mode', state.msgMode);

  // Clear any custom brand override first
  root.style.removeProperty('--app-brand');
  root.style.removeProperty('--app-brand-hover');
  root.style.removeProperty('--app-brand-active');
  root.style.removeProperty('--app-custom-gradient');
  root.style.removeProperty('background-image');

  if (state.mode === 'custom') {
    const triplet = hexToRgbTriplet(state.brand);
    if (triplet) {
      root.style.setProperty('--app-brand', triplet);
      const hover  = shade(state.brand, -16); if (hover)  root.style.setProperty('--app-brand-hover',  hover);
      const active = shade(state.brand, -32); if (active) root.style.setProperty('--app-brand-active', active);
    }
    const colors = (state.gradient || []).filter(Boolean).slice(0, 5);
    if (colors.length >= 2) {
      const stops = colors.join(', ');
      root.style.setProperty('--app-custom-gradient', `linear-gradient(135deg, ${stops})`);
      // Apply gradient to body background for visual flair
      document.body.style.backgroundImage = `linear-gradient(135deg, ${stops})`;
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      document.body.style.backgroundImage = '';
    }
  } else {
    document.body.style.backgroundImage = '';
  }
}

let systemMql = null;

export const useThemeStore = create((set, get) => ({
  ...loadInitial(),

  apply() {
    applyToDOM(get());
  },

  setMode(mode) {
    set({ mode });
    persist(get());
    applyToDOM(get());
    // Subscribe to system changes when needed
    if (mode === 'system' && typeof window !== 'undefined') {
      if (systemMql) systemMql.removeEventListener?.('change', get().apply);
      systemMql = window.matchMedia('(prefers-color-scheme: light)');
      systemMql.addEventListener?.('change', get().apply);
    } else if (systemMql) {
      systemMql.removeEventListener?.('change', get().apply);
      systemMql = null;
    }
  },

  setDensity(density) {
    set({ density });
    persist(get());
    applyToDOM(get());
  },

  setMsgMode(msgMode) {
    set({ msgMode });
    persist(get());
    applyToDOM(get());
  },

  setCustomBase(customBase) {
    set({ customBase });
    persist(get());
    applyToDOM(get());
  },

  setBrand(brand) {
    set({ brand });
    persist(get());
    applyToDOM(get());
  },

  setGradient(gradient) {
    const arr = Array.isArray(gradient) ? gradient.slice(0, 5) : [];
    set({ gradient: arr });
    persist(get());
    applyToDOM(get());
  },

  reset() {
    set(DEFAULTS);
    persist(get());
    applyToDOM(get());
    pushToServer(get()).catch(() => {});
  },

  // Pull theme settings from the server and apply (called on login bootstrap)
  async syncFromServer() {
    try {
      const { data } = await api.get('/users/me/theme');
      if (!data?.theme) return;
      const t = data.theme;
      set({
        mode:       t.mode       || get().mode,
        density:    t.density    || get().density,
        msgMode:    t.msg_mode   || get().msgMode,
        customBase: t.custom_base|| get().customBase,
        brand:      t.brand_color|| get().brand,
        gradient:   Array.isArray(t.gradient) ? t.gradient : get().gradient,
      });
      persist(get());
      applyToDOM(get());
    } catch (_) { /* server-side persistence is best-effort */ }
  },
}));

let pushTimer = null;
async function pushToServer(state) {
  try {
    await api.put('/users/me/theme', {
      mode: state.mode,
      density: state.density,
      msg_mode: state.msgMode,
      custom_base: state.customBase,
      brand_color: state.brand,
      gradient: state.gradient,
    });
  } catch (_) { /* swallow */ }
}

// Debounced server sync whenever any field changes.
useThemeStore.subscribe((state, prev) => {
  if (
    state.mode === prev.mode &&
    state.density === prev.density &&
    state.msgMode === prev.msgMode &&
    state.customBase === prev.customBase &&
    state.brand === prev.brand &&
    JSON.stringify(state.gradient) === JSON.stringify(prev.gradient)
  ) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushToServer(state), 400);
});

// Apply once on import so theme is correct before React renders.
if (typeof document !== 'undefined') {
  applyToDOM(useThemeStore.getState());
  // If saved mode is 'system', listen to OS changes
  const s = useThemeStore.getState();
  if (s.mode === 'system' && typeof window !== 'undefined') {
    systemMql = window.matchMedia('(prefers-color-scheme: light)');
    systemMql.addEventListener?.('change', () => applyToDOM(useThemeStore.getState()));
  }
}
