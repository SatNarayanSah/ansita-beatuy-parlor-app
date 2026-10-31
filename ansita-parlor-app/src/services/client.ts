import { getApiConfig } from './config';

export type ApiErrorCode =
  | 'NETWORK'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT';

const DEFAULT_MESSAGES: Record<ApiErrorCode, string> = {
  NETWORK: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'Your session has expired. Please sign in again.',
  FORBIDDEN: 'You do not have permission to do that.',
  NOT_FOUND: 'The requested item could not be found.',
  VALIDATION: 'Some of the details are invalid.',
  CONFLICT: 'This action conflicts with existing data.',
};

/** The only error type services throw. Screens can switch on `code`. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string = DEFAULT_MESSAGES[code]) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

/** User-facing message for any thrown value. */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.length > 0) return error.message;
  return 'Something went wrong. Please try again.';
};

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const randomLatency = (): number => {
  const { minLatencyMs, maxLatencyMs } = getApiConfig();
  return Math.round(minLatencyMs + Math.random() * (maxLatencyMs - minLatencyMs));
};

export interface RequestOptions {
  /** Skip random error injection (e.g. for sign-out, which must always succeed). */
  neverFail?: boolean;
}

/**
 * Simulates a network round-trip: waits 300-700ms, optionally fails at random,
 * then runs the handler (which reads/writes the local stores as if it were the server).
 *
 * To connect a real backend, replace each service function body with an HTTP call;
 * screens only depend on the service signatures.
 */
export const simulateRequest = async <T>(
  handler: () => T,
  { neverFail = false }: RequestOptions = {},
): Promise<T> => {
  await wait(randomLatency());
  const { simulateErrors, errorRate } = getApiConfig();
  if (!neverFail && simulateErrors && Math.random() < errorRate) {
    throw new ApiError('NETWORK');
  }
  return handler();
};

/** Narrow a possibly-missing entity or throw NOT_FOUND. */
export const ensureFound = <T>(value: T | undefined | null, entityName: string): T => {
  if (value === undefined || value === null) {
    throw new ApiError('NOT_FOUND', `${entityName} not found.`);
  }
  return value;
};
