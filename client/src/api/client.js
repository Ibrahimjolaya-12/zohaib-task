import axios from 'axios';

/**
 * Same-origin API client: Vite proxies /api to the Express server, so the
 * httpOnly auth cookies flow automatically with withCredentials.
 */
const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.includes('/auth/');

    // Access token expired -> try one silent refresh, then replay the request.
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        refreshing = refreshing || api.post('/auth/refresh').finally(() => (refreshing = null));
        await refreshing;
        return api(original);
      } catch {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const apiError = (err) => err?.response?.data?.error || err?.message || 'Something went wrong';

export default api;
