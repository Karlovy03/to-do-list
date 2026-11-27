/**
 * Видиме вікно годин. Сітка не гортається вбік: на вузькому екрані вікно коротше,
 * а «‹ раніше / пізніше ›» (чи свайп) зсувають його — так назва обрізаної смуги завжди на виду.
 */

/** Телефон показує ~3,5 години (Figma 15, 16) */
export const PHONE_SPAN = 3.5;
/** Ширше — стільки годин, скільки влазить по 56 px, щоб підписи «08:00» не налазили */
export const MIN_HOUR_PX = 56;
/** На скільки годин зсуває одне натискання */
export const SHIFT_HOURS = 3;

export function visibleSpan(trackPx: number, phone: boolean, [from, to]: [number, number]) {
  const all = to - from;
  if (phone) return Math.min(PHONE_SPAN, all);
  return Math.min(all, Math.max(PHONE_SPAN, Math.floor(trackPx / MIN_HOUR_PX)));
}

const clamp = (start: number, span: number, [from, to]: [number, number]) => Math.min(Math.max(start, from), to - span);

/** Початок вікна: година до «зараз», якщо сьогодні в періоді; інакше — початок робочої доби */
export function defaultStart(span: number, range: [number, number], nowHour: number | null) {
  return clamp(nowHour === null ? range[0] : Math.floor(nowHour) - 1, span, range);
}

export function shiftStart(start: number, dir: 1 | -1, span: number, range: [number, number]) {
  return clamp(start + dir * SHIFT_HOURS, span, range);
}
