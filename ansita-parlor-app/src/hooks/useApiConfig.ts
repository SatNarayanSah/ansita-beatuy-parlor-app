import { useSyncExternalStore } from 'react';

import { getApiConfig, subscribeApiConfig, type ApiConfig } from '@/services/config';

/** Live view of the fake API settings (latency, error simulation). */
export const useApiConfig = (): ApiConfig => useSyncExternalStore(subscribeApiConfig, getApiConfig);
