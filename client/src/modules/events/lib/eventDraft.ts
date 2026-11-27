/** Що з «Нового заходу» живе в чернетці (Figma 41); початок — лише якщо ще не минув */
export interface EventDraft {
  title: string;
  description: string;
  participants: string[];
  duration: number;
  startsAt: string | null;
}

/** Збережене на пристрої — як дані ззовні: невідоме відкидається */
export function parseEventDraft(raw: unknown, now = new Date()): EventDraft | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.title !== 'string') return null;
  return {
    title: r.title,
    description: typeof r.description === 'string' ? r.description : '',
    participants: Array.isArray(r.participants) ? r.participants.filter((x): x is string => typeof x === 'string') : [],
    duration: typeof r.duration === 'number' && r.duration > 0 ? r.duration : 30,
    startsAt: typeof r.startsAt === 'string' && Date.parse(r.startsAt) > now.getTime() ? r.startsAt : null,
  };
}
