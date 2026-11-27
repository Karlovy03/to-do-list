/**
 * Пам'ять місця на цьому пристрої (ADR-0022): останній фільтр розділу, згорнуті групи.
 * Окремо для кожної людини, а при виході стирається — на спільному комп'ютері наступний не побачить чужого.
 * Сховище може бути недоступне (приватний режим) — тоді просто не пам'ятаємо.
 */
const PREFIX = 'kt_mem_';
/** Інша зручність цього пристрою, що стосується людини, а не пристрою, — теж стирається при виході */
const PERSONAL = ['kt_recent_people'];

const keyOf = (userId: string, name: string) => `${PREFIX}${userId}_${name}`;

export function recall(userId: string, name: string): string | null {
  try {
    return localStorage.getItem(keyOf(userId, name));
  } catch {
    return null;
  }
}

export function remember(userId: string, name: string, value: string | null) {
  try {
    if (value === null || value === '') localStorage.removeItem(keyOf(userId, name));
    else localStorage.setItem(keyOf(userId, name), value);
  } catch {
    /* сховище недоступне — просто не запам'ятається */
  }
}

/** Вихід: стерти все, що пам'ятали про людей на цьому пристрої; налаштування самого пристрою (прозорість) лишаються */
export function forgetPeople() {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(PREFIX) || PERSONAL.includes(k))) doomed.push(k);
    }
    for (const k of doomed) localStorage.removeItem(k);
  } catch {
    /* нічого не було збережено */
  }
}

/**
 * Останній вибір розділу з адреси — без дня: учорашня дата завтра лише заважала б.
 * Розділ відкривається з ним, лише коли в адресі порожньо: посилання, яким поділились, важливіше.
 */
export function rememberPlace(userId: string, name: string, sp: URLSearchParams) {
  const place = new URLSearchParams(sp);
  place.delete('date');
  remember(userId, name, place.toString());
}

export const recallPlace = (userId: string, name: string) => new URLSearchParams(recall(userId, name) ?? '');

/** Що показати: адреса, а якщо в ній порожньо — запам'ятоване */
export const placeOrRemembered = (sp: URLSearchParams, userId: string, name: string) => (sp.toString() ? sp : recallPlace(userId, name));
