import { API_BASE, isNative } from '../lib/platform';
import { getToken } from '../lib/token';

/** Помилка API з машинним кодом; текст до коду — у shared/texts/errors.yml */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

export const UNAUTHORIZED_EVENT = 'kt:unauthorized';

type Query = Record<string, string | number | boolean | undefined>;

function url(path: string, query?: Query) {
  const qs = query
    ? Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  return `${API_BASE}/api${path}${qs ? `?${qs}` : ''}`;
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; query?: Query } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (isNative) {
    headers['X-Client'] = 'native';
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(url(path, init.query), {
      method: init.method ?? 'GET',
      headers,
      credentials: isNative ? 'omit' : 'same-origin',
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'offline');
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.status === 401 && path !== '/auth/login') window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new ApiError(res.status, data.error ?? 'internal');
  }
  // 204 — успіх без тіла (напр. видалення)
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
