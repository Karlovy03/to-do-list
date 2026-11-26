/**
 * Обмеження спроб входу. Пам'ять процесу — достатньо для одного екземпляра сервера (ADR-0009).
 * - пара логін+адреса: перебір пароля одного акаунта з однієї адреси;
 * - адреса: перебір логінів;
 * - логін з будь-яких адрес: поріг високий навмисно — інакше будь-хто з 10 спробами
 *   блокував би вхід директору чи керівнику на 15 хвилин.
 */
const WINDOW_MS = 15 * 60_000;
const LIMITS = { pair: 10, ip: 30, login: 100 };

const hits = new Map<string, { n: number; until: number }>();

function prune(now: number) {
  if (hits.size < 5_000) return;
  for (const [k, v] of hits) if (v.until <= now) hits.delete(k);
}

const keys = (login: string, ip: string) => [
  { key: `pair:${login}:${ip}`, limit: LIMITS.pair },
  { key: `ip:${ip}`, limit: LIMITS.ip },
  { key: `login:${login}`, limit: LIMITS.login },
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
  /** Успіх скидає лічильники цього логіна — лічильник адреси лишається */
  success(login: string, ip: string) {
    hits.delete(`pair:${login}:${ip}`);
    hits.delete(`login:${login}`);
  },
  reset() {
    hits.clear();
  },
};
