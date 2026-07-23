import { create } from 'zustand';
import api from '../api/client';
import { checkRole } from '../constants/roles';

let initPromise = null;

const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,

  init: async () => {
    // Prevent concurrent init calls (StrictMode double-mount)
    if (initPromise) return initPromise;
    initPromise = (async () => {
      try {
        const { data } = await api.get('/auth/me');
        set({ user: data, loading: false });
      } catch {
        set({ user: null, loading: false });
      } finally {
        initPromise = null;
      }
    })();
    return initPromise;
  },

  login: async (email, password, rememberMe = false) => {
    const { data } = await api.post('/auth/login', {
      email,
      password,
      remember_me: rememberMe,
    });
    set({ user: data.user });
    return data;
  },

  register: async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    set({ user: data.user });
    return data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore — cookies may already be cleared
    }
    set({ user: null });
  },

  hasRole: (minRole) => {
    const user = get().user;
    if (!user) return false;
    return checkRole(user.role, minRole);
  },
}));

export default useAuthStore;
