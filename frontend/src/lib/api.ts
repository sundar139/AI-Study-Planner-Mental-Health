
import axios, { AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth';

/**
 * Axios instance configured for AssignWell API.
 *
 * - Pulls base URL from `NEXT_PUBLIC_API_URL` or localStorage fallback.
 * - Attaches `Authorization` header from cookie/Zustand store.
 * - Retries on timeouts with extended timeout.
 * - Soft-handles network errors by switching localhost variants.
 * - Redirects to `/login` on 401 for protected flows.
 */

const defaultBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1'
const storedBase = typeof window !== 'undefined' ? window.localStorage.getItem('assignwell.apiBase') : null
const api = axios.create({
    baseURL: storedBase || defaultBase,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || 20000),
});

const readCookieToken = (): string | null => {
  try {
    if (typeof document === 'undefined') return null
    const m = document.cookie.split('; ').find((c) => c.startsWith('assignwell_token='))
    return m ? decodeURIComponent(m.split('=')[1]) : null
  } catch { return null }
}

// Attach token from store/cookie
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token || readCookieToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle timeouts, network fallback, and 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isTimeout = (error && (error.code === 'ECONNABORTED' || String(error.message || '').toLowerCase().includes('timeout')))
    if (isTimeout) {
      try {
        const cfg = (error.config || {}) as AxiosRequestConfig & { __retryOnTimeout?: boolean }
        if (!cfg.__retryOnTimeout) {
          cfg.__retryOnTimeout = true
          cfg.timeout = Math.max(Number(cfg.timeout || 0), 45000)
          return await api.request(cfg)
        }
      } catch {}
    }
    if (!error.response && (error.message === 'Network Error' || error.code === 'ERR_NETWORK')) {
      const tried = api.defaults.baseURL
      const candidate = ['http://localhost:8000/api/v1', 'http://127.0.0.1:8000/api/v1']
        .find((b) => b && b !== tried) || defaultBase
      try {
        api.defaults.baseURL = candidate
        if (typeof window !== 'undefined') window.localStorage.setItem('assignwell.apiBase', candidate)
        const cfg = error.config
        cfg.baseURL = candidate
        return await api.request(cfg)
      } catch {
        // swallow repeated network errors
      }
    }
    if (error.response?.status === 401) {
      const url = String(error.config?.url || '')
      // Soft-handle unauthorized without auto-logout to avoid random session drops during dev/HMR
      if (typeof window !== 'undefined') {
        const path = window.location.pathname
        const isPublic = path.startsWith('/login') || path.startsWith('/register')
        // Redirect only if on a protected route and the failing call is a user/session check
        if (!isPublic && (url.includes('/users/me') || url.includes('/auth'))) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
