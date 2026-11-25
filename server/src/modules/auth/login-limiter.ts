/**
 * Обмеження спроб входу: окремо за логіном (перебір пароля одного акаунта)
 * і за адресою (перебір логінів). Пам'ять процесу — достатньо для одного екземпляра
 * сервера (ADR-0009); для кількох — винести в БД.
 */
const WINDOW_MS = 15 * 60_000;
const LIMITS = { login: 10, ip: 30 };

const hits = new Map<string, { n: number; until: number }>();

function prune(now: number) {
  if (hits.size < 5_000) return;
  for (const [k, v] of hits) if (v.until <= now) hits.delete(k);
}

const keys = (login: string, ip: string) => [
  { key: `login:${login}`, limit: LIMITS.login },
  { key: `ip:${ip}`, limit: LIMITS.ip },
];

export const loginLimiter = {
  isBlocked(login: string, ip: string, now = Date.now()) {
    return keys(login, ip).some(({ key, limit }) => {
      const h = hits.get(key);
      return !!h && h.until > now && h.n >= limit;
    });
  },
  fail(login: string, ip: string, now = Date.now()) {
    prune(now);
    for (const { key } of keys(login, ip)) {
      const h = hits.get(key);
      hits.set(key, h && h.until > now ? { n: h.n + 1, until: h.until } : { n: 1, until: now + WINDOW_MS });
    }
  },
  /** Успіх скидає лічильник лише цього логіна — лічильник адреси лишається */
  success(login: string) {
    hits.delete(`login:${login}`);
  },
  reset() {
    hits.clear();
  },
};
