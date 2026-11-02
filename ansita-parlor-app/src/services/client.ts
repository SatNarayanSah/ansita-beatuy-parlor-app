import { File } from 'expo-file-system';

import { useAuthStore } from '@/store/authStore';

import { API_URL, REQUEST_TIMEOUT_MS, setOffline } from './config';

export type ApiErrorCode =
  | 'NETWORK'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT';

const DEFAULT_MESSAGES: Record<ApiErrorCode, string> = {
  NETWORK: 'Can’t reach the Ansita server. Check your internet connection and try again.',
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

const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  400: 'VALIDATION',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION',
};

type QueryValue = string | number | boolean | null | undefined | readonly string[];

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, QueryValue>;
}

const buildUrl = (path: string, query?: Record<string, QueryValue>): string => {
  const params = Object.entries(query ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => {
      const text = Array.isArray(value) ? value.join(',') : String(value);
      return `${encodeURIComponent(key)}=${encodeURIComponent(text)}`;
    });
  return `${API_URL}${path}${params.length > 0 ? `?${params.join('&')}` : ''}`;
};

const parseBody = (text: string): unknown => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/**
 * Calls the backend with the signed-in user's token and maps failures to ApiError:
 * 401 → UNAUTHORIZED (and signs out), 403 → FORBIDDEN, 404 → NOT_FOUND,
 * 409 → CONFLICT, 400/422 → VALIDATION, unreachable / 5xx → NETWORK.
 */
export const api = async <T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, options: RequestOptions = {}): Promise<T> => {
  const token = useAuthStore.getState().token;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    setOffline(true);
    throw new ApiError('NETWORK');
  } finally {
    clearTimeout(timer);
  }
  setOffline(false);

  const data = parseBody(await response.text());
  if (response.ok) return data as T;

  const payload = (data ?? {}) as { code?: string; message?: string };
  const message = typeof payload.message === 'string' && payload.message.length > 0 ? payload.message : undefined;
  if (response.status >= 500) {
    throw new ApiError('NETWORK', 'The server had a problem. Please try again in a moment.');
  }
  const code = STATUS_TO_CODE[response.status] ?? 'VALIDATION';
  // An expired or revoked token: drop the session so the app returns to sign-in.
  if (code === 'UNAUTHORIZED' && token && useAuthStore.getState().token === token) {
    useAuthStore.getState().clearSession();
  }
  throw new ApiError(code, message);
};

/** Narrow a possibly-missing entity or throw NOT_FOUND. */
export const ensureFound = <T>(value: T | undefined | null, entityName: string): T => {
  if (value === undefined || value === null) {
    throw new ApiError('NOT_FOUND', `${entityName} not found.`);
  }
  return value;
};

/** The server's limit for one image. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const imageTypeOf = (bytes: Uint8Array): string | null => {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  if (String.fromCharCode(...bytes.slice(0, 3)) === 'GIF') return 'image/gif';
  return null;
};

/**
 * Uploads a photo picked on this phone (a local file:// URI) and returns its public URL,
 * which is what gets saved on the record so the website and other phones can show it too.
 *
 * The file is read with expo-file-system and sent as raw bytes. (Reading it through
 * `fetch(uri).blob()` gives a Blob React Native's uploader can't send, so the server
 * received junk and refused it as "not an image".)
 */
export const uploadImage = async (localUri: string): Promise<string> => {
  let buffer: ArrayBuffer;
  try {
    buffer = await new File(localUri).arrayBuffer();
  } catch {
    throw new ApiError('VALIDATION', 'Couldn’t read that photo. Please choose another one.');
  }
  const bytes = new Uint8Array(buffer);
  if (bytes.byteLength === 0) throw new ApiError('VALIDATION', 'That photo is empty. Please choose another one.');
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new ApiError('VALIDATION', 'That photo is larger than 5 MB. Please choose a smaller one.');
  const contentType = imageTypeOf(bytes);
  if (!contentType) throw new ApiError('VALIDATION', 'Use a JPG, PNG, WebP or GIF photo.');

  const token = useAuthStore.getState().token;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS * 3);
  let response: Response;
  try {
    response = await fetch(`${API_URL}/uploads`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': contentType, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      // A plain ArrayBuffer is the body type both Expo's and React Native's fetch send as-is.
      body: buffer,
      signal: controller.signal,
    });
  } catch {
    setOffline(true);
    throw new ApiError('NETWORK');
  } finally {
    clearTimeout(timer);
  }
  setOffline(false);

  const data = parseBody(await response.text()) as { url?: string; message?: string } | null;
  if (response.ok && typeof data?.url === 'string') return data.url;
  if (response.status >= 500) throw new ApiError('NETWORK', 'The server had a problem. Please try again in a moment.');
  const message = typeof data?.message === 'string' && data.message.length > 0 ? data.message : undefined;
  throw new ApiError(STATUS_TO_CODE[response.status] ?? 'VALIDATION', message ?? (response.status === 413 ? 'That photo is too large.' : undefined));
};

/**
 * Before saving a record: if its photo field holds a photo picked on this phone, upload it
 * and put the public URL in its place. Other values (a URL, null, absent) pass through.
 */
export const withUploadedImage = async <T extends object, K extends keyof T>(input: T, key: K): Promise<T> => {
  const value = input[key];
  return typeof value === 'string' && isLocalImageUri(value) ? { ...input, [key]: await uploadImage(value) } : input;
};

/** Device-only file paths, from before photos were uploaded; nobody else can open them. */
export const isLocalImageUri = (uri: string | null | undefined): uri is string => Boolean(uri) && !/^https?:\/\//.test(uri ?? '');
