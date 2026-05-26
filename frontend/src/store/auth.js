import { create } from 'zustand';
import api from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('chat_token') || null,
  loading: false,
  error: null,

  setToken(token) {
    if (token) localStorage.setItem('chat_token', token);
    else localStorage.removeItem('chat_token');
    set({ token });
  },

  async login(email, password) {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      get().setToken(data.token);
      set({ user: data.user, loading: false });
      return data.user;
    } catch (e) {
      const error = e?.response?.data?.error || 'Login failed';
      set({ loading: false, error });
      throw new Error(error);
    }
  },

  async register(username, email, password) {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/register', { username, email, password });
      get().setToken(data.token);
      set({ user: data.user, loading: false });
      return data.user;
    } catch (e) {
      const error = e?.response?.data?.error || 'Registration failed';
      set({ loading: false, error });
      throw new Error(error);
    }
  },

  async fetchMe() {
    if (!get().token) return null;
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user });
      return data.user;
    } catch (e) {
      get().logout();
      return null;
    }
  },

  logout() {
    get().setToken(null);
    set({ user: null });
  },
}));
