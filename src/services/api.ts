import axios from 'axios';
import { auth } from '@config/firebase';
import { Config } from '@config/index';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
  baseURL: `${Config.apiBaseUrl}/api`,
  timeout: 30_000,
});

// ── Retry helper ──────────────────────────────────────────────────────────────
const retryRequest = async (error: any, maxRetries = 2) => {
  const config = error.config;
  const status = error.response?.status;
  const isClientError = status && status >= 400 && status < 500;
  if (!config || isClientError) return Promise.reject(error);

  config._retryCount = (config._retryCount || 0) + 1;
  if (config._retryCount > maxRetries) return Promise.reject(error);

  const delay = Math.min(1000 * 2 ** (config._retryCount - 1), 8000);
  await new Promise((r) => setTimeout(r, delay));

  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {}

  return api(config);
};

// ── Request interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (e) {
        console.warn('[api] Failed to get ID token:', e);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Token refresh state ───────────────────────────────────────────────────────
let isRefreshing = false;
let _refreshQueue: { resolve: (t: string) => void; reject: (e: any) => void }[] = [];
let _refreshRetryCount = 0;
const MAX_REFRESH_RETRIES = 1;

// Navigation ref — set by RootNavigator on mount
let _navigateToLogin: (() => void) | null = null;
export const registerLoginNavigator = (fn: () => void) => {
  _navigateToLogin = fn;
};

const _drainRefreshQueue = (newToken: string | null, err: Error | null) => {
  _refreshQueue.forEach(({ resolve, reject }) => {
    if (err) reject(err);
    else resolve(newToken!);
  });
  _refreshQueue = [];
};

const _forceLogout = (reason = 'Session expired. Please log in again.') => {
  isRefreshing = false;
  _refreshRetryCount = 0;
  _drainRefreshQueue(null, new Error(reason));
  SecureStore.deleteItemAsync('auth_token').catch(() => {});
  _navigateToLogin?.();
  return Promise.reject(new Error(reason));
};

// ── Response interceptor ──────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      try {
        return await retryRequest(error);
      } catch {
        const err = new Error('Unable to reach the server. Please check your connection.');
        (err as any).code = 'NETWORK_ERROR';
        (err as any).isNetworkError = true;
        return Promise.reject(err);
      }
    }

    const status = error.response.status;

    if (status >= 500) {
      try {
        return await retryRequest(error);
      } catch {}
    }

    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      'Something went wrong.';

    const code =
      error.response?.data?.error?.code ||
      error.response?.data?.code ||
      'UNKNOWN';

    if (status === 401) {
      const originalConfig = error.config;

      if (originalConfig._skipRefresh || _refreshRetryCount >= MAX_REFRESH_RETRIES) {
        return _forceLogout();
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          _refreshQueue.push({
            resolve: (newToken) => {
              originalConfig.headers = originalConfig.headers || {};
              originalConfig.headers.Authorization = `Bearer ${newToken}`;
              originalConfig._skipRefresh = true;
              resolve(api(originalConfig));
            },
            reject,
          });
        });
      }

      isRefreshing = true;
      _refreshRetryCount += 1;

      try {
        const user = auth.currentUser;
        if (!user) return _forceLogout();

        const newToken = await user.getIdToken(true);
        isRefreshing = false;
        _refreshRetryCount = 0;

        _drainRefreshQueue(newToken, null);

        originalConfig.headers = originalConfig.headers || {};
        originalConfig.headers.Authorization = `Bearer ${newToken}`;
        originalConfig._skipRefresh = true;
        return api(originalConfig);
      } catch {
        return _forceLogout();
      }
    }

    const err = new Error(message);
    (err as any).code = code;
    (err as any).status = status;
    return Promise.reject(err);
  }
);

export default api;