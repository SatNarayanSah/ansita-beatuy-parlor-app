/**
 * Thin fetch wrapper around the Ansita FastAPI backend. The backend owns the
 * database (SQLite locally, Postgres in production), so every read and write
 * from this site goes through the same business rules as the mobile app.
 */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

const TOKEN_KEY = "ansita.admin.token";

export type ApiErrorCode = "NETWORK" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "CONFLICT";

export class ApiError extends Error {
  constructor(public code: ApiErrorCode, message: string, public status = 0) {
    super(message);
    this.name = "ApiError";
  }
}

export const tokenStore = {
  get(): string | null {
    try {
      return typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string | null) {
    try {
      if (token) window.localStorage.setItem(TOKEN_KEY, token);
      else window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable: the session lasts for this tab only */
    }
  },
};

/** Called when the server rejects the token, so the shell can send the user to /login. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type Query = Record<string, string | number | boolean | string[] | null | undefined>;

function buildUrl(path: string, query?: Query) {
  const url = new URL(API_URL + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) value.forEach((v) => url.searchParams.append(key, v));
      else url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("NETWORK", `Can't reach the server at ${API_URL}. Is the backend running?`);
  }

  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const code = (data?.code as ApiErrorCode) || (response.status === 401 ? "UNAUTHORIZED" : "VALIDATION");
    if (code === "UNAUTHORIZED" && token) onUnauthorized?.();
    throw new ApiError(code, data?.message || response.statusText || "Something went wrong.", response.status);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, undefined, query),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  del: <T = void>(path: string) => request<T>("DELETE", path),
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

export type UploadedImage = { id: string; url: string; contentType: string; size: number };

/**
 * Upload an image (admins only). Sends the raw bytes, not form data, and reports progress
 * from 0 to 1 (fetch can't report upload progress, so this uses XMLHttpRequest).
 */
export function uploadImage(file: Blob, onProgress?: (fraction: number) => void): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", API_URL + "/uploads");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    const token = tokenStore.get();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onerror = () => reject(new ApiError("NETWORK", `Can't reach the server at ${API_URL}. Is the backend running?`));
    xhr.onload = () => {
      let data: { code?: ApiErrorCode; message?: string } | UploadedImage | null = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* not JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data && "url" in data) return resolve(data);
      const err = (data ?? {}) as { code?: ApiErrorCode; message?: string };
      const code = err.code || (xhr.status === 401 ? "UNAUTHORIZED" : "VALIDATION");
      if (code === "UNAUTHORIZED" && token) onUnauthorized?.();
      reject(new ApiError(code, err.message || (xhr.status === 413 ? "That image is too large." : "Upload failed."), xhr.status));
    };
    xhr.send(file);
  });
}
