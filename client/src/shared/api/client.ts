import { API_BASE, isNative } from '../lib/platform';
import { getToken } from '../lib/token';

/** Помилка API з машинним кодом; текст до коду — у shared/texts/errors.yml, details — що в нього підставити */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public details: Record<string, string> = {},
  ) {
    super(code);
  }
}

/** Тіло відповіді з помилкою: { error, ...що підставити в текст } */
export function apiErrorOf(status: number, data: unknown): ApiError {
  const body = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
  const details: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) if (k !== 'error' && typeof v === 'string') details[k] = v;
  return new ApiError(status, typeof body.error === 'string' ? body.error : 'internal', details);
}

export const UNAUTHORIZED_EVENT = 'kt:unauthorized';

type Query = Record<string, string | number | boolean | undefined>;

/** Як застосунок і браузер входять: застосунок — токен у заголовку, браузер — cookie (той самий набір і для потоку живих оновлень) */
export function authInit(): { headers: Record<string, string>; credentials: RequestCredentials } {
  const headers: Record<string, string> = {};
  if (isNative) {
    headers['X-Client'] = 'native';
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return { headers, credentials: isNative ? 'omit' : 'same-origin' };
}

export function url(path: string, query?: Query) {
  const qs = query
    ? Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  return `${API_BASE}/api${path}${qs ? `?${qs}` : ''}`;
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; query?: Query; keepalive?: boolean } = {}): Promise<T> {
  const { headers, credentials } = authInit();
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(url(path, init.query), {
      method: init.method ?? 'GET',
      headers,
      credentials,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      // запит переживає закриття вкладки (відкладене «Виконано»)
      keepalive: init.keepalive,
    });
  } catch {
    throw new ApiError(0, 'offline');
  }
  if (!res.ok) {
    const data: unknown = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== '/auth/login') window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw apiErrorOf(res.status, data);
  }
  // 204 — успіх без тіла (напр. видалення)
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
