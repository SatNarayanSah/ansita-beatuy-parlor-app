export interface ApiConfig {
  /** Minimum simulated network latency in ms. */
  minLatencyMs: number;
  /** Maximum simulated network latency in ms. */
  maxLatencyMs: number;
  /** When true, requests randomly fail with a NETWORK error. Off by default. */
  simulateErrors: boolean;
  /** Probability (0-1) that a request fails when `simulateErrors` is on. */
  errorRate: number;
  /** Demo "airplane mode": every request fails with a NETWORK error. */
  offline: boolean;
}

const DEFAULT_CONFIG: ApiConfig = {
  minLatencyMs: 300,
  maxLatencyMs: 700,
  simulateErrors: false,
  errorRate: 0.2,
  offline: false,
};

let currentConfig: ApiConfig = { ...DEFAULT_CONFIG };

type Listener = (config: ApiConfig) => void;
const listeners = new Set<Listener>();

export const getApiConfig = (): ApiConfig => currentConfig;

export const configureApi = (patch: Partial<ApiConfig>): ApiConfig => {
  const next: ApiConfig = { ...currentConfig, ...patch };
  next.minLatencyMs = Math.max(0, next.minLatencyMs);
  next.maxLatencyMs = Math.max(next.minLatencyMs, next.maxLatencyMs);
  next.errorRate = Math.min(1, Math.max(0, next.errorRate));
  currentConfig = next;
  listeners.forEach((listener) => listener(currentConfig));
  return currentConfig;
};

export const resetApiConfig = (): ApiConfig => configureApi(DEFAULT_CONFIG);

export const subscribeApiConfig = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
