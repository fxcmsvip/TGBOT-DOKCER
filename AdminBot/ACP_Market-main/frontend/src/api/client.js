import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Auto-unwrap APIResponse envelope: { code, message, data } → data
api.interceptors.response.use(
  (res) => {
    if (res.data && typeof res.data === 'object' && 'data' in res.data && 'code' in res.data) {
      res.data = res.data.data;
    }
    return res;
  },
);

// Coalesce concurrent 401 refresh attempts into a single request
let refreshPromise = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post('/api/v1/auth/refresh', {}, { withCredentials: true })
            .finally(() => { refreshPromise = null; });
        }
        await refreshPromise;
        return api(original);
      } catch {
        // Dynamically import to avoid circular dependency
        const { default: useAuthStore } = await import('../stores/authStore');
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
