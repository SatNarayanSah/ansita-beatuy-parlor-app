import Constants from 'expo-constants';

/** Port the Python backend listens on during development (`uvicorn ... --port 8000`). */
const DEV_API_PORT = 8000;

/**
 * Where the backend lives:
 * 1. `EXPO_PUBLIC_API_URL` (set it for production builds, e.g. https://ansita-api.onrender.com).
 * 2. In development, the computer running `expo start` on port 8000, so a phone on the
 *    same Wi-Fi reaches the local backend with no setup.
 */
const resolveApiUrl = (): string => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host || 'localhost'}:${DEV_API_PORT}`;
};

export const API_URL = resolveApiUrl();

/** A cold server (e.g. Render's free plan waking up) can take up to a minute to answer. */
export const REQUEST_TIMEOUT_MS = 70_000;

export interface ApiConfig {
  apiUrl: string;
  /** True after a request could not reach the server; cleared by the next successful one. */
  offline: boolean;
}

let currentConfig: ApiConfig = { apiUrl: API_URL, offline: false };

type Listener = (config: ApiConfig) => void;
const listeners = new Set<Listener>();

export const getApiConfig = (): ApiConfig => currentConfig;

export const setOffline = (offline: boolean): void => {
  if (currentConfig.offline === offline) return;
  currentConfig = { ...currentConfig, offline };
  listeners.forEach((listener) => listener(currentConfig));
};

export const subscribeApiConfig = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
