/**
 * Plugin API client.
 *
 * Uses the host Panel's authenticated axios instance which has JWT
 * token management, automatic refresh on 401, and all interceptors.
 * The host exposes it as window.__ACP_API.
 */
const hostApi = (window as any).__ACP_API;

if (!hostApi) {
  console.warn('[movie-request] Host API not available, plugin API calls may fail');
}

// Wrapper: use host's axios but scope requests to plugin's base path
const pluginApi = {
  get: (url: string, config?: any) => hostApi.get(`/p/movie-request${url}`, config),
  post: (url: string, data?: any, config?: any) => hostApi.post(`/p/movie-request${url}`, data, config),
  put: (url: string, data?: any, config?: any) => hostApi.put(`/p/movie-request${url}`, data, config),
  patch: (url: string, data?: any, config?: any) => hostApi.patch(`/p/movie-request${url}`, data, config),
  delete: (url: string, config?: any) => hostApi.delete(`/p/movie-request${url}`, config),
};

export default pluginApi;
