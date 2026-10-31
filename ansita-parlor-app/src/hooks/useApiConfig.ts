import { useSyncExternalStore } from 'react';

import { getApiConfig, subscribeApiConfig, type ApiConfig } from '@/services/config';

/** Live view of the API connection: server address and whether it is currently reachable. */
export const useApiConfig = (): ApiConfig => useSyncExternalStore(subscribeApiConfig, getApiConfig);
