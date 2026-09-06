import axios from 'axios';

/**
 * Updated API client configuration supporting both local proxy and Vercel production deployment.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
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