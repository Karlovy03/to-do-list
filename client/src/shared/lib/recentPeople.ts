/** Кого людина нещодавно обирала — підказка у виборі людей; лише зручність цього пристрою */
const KEY = 'kt_recent_people';
const MAX = 8;

export function recentPeople(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function rememberPerson(id: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify([id, ...recentPeople().filter((x) => x !== id)].slice(0, MAX)));
  } catch {
    /* сховище недоступне — підказка просто не запам'ятається */
  }
}
