export type PluralForm = 'one' | 'few' | 'many';

/** Українська множина: 1, 21 — one; 2–4, 22–24 — few; 5–20, 11–14 — many */
export function pluralForm(n: number): PluralForm {
  const d = n % 10;
  const h = n % 100;
  if (d === 1 && h !== 11) return 'one';
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return 'few';
  return 'many';
}
