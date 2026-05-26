import { create } from 'zustand';
import axios from 'axios';
import { API_URL } from '../services/endpoints';

export const useBrandingStore = create((set) => ({
  app_name: 'Chat System',
  app_short: 'CS',
  loaded: false,

  async fetch() {
    try {
      const { data } = await axios.get(`${API_URL}/api/system/branding`);
      set({
        app_name: data.app_name || 'Chat System',
        app_short: data.app_short || 'CS',
        loaded: true,
      });
      // Sync document title
      if (typeof document !== 'undefined') document.title = data.app_name || 'Chat System';
    } catch (_) {
      set({ loaded: true });
    }
  },
}));
