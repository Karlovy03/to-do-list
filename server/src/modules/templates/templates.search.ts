/*
 * Пошук (ADR-0023): у базі лежить searchText — назва, опис і текст у нижньому регістрі.
 * Регістр знижуємо тут, а не в SQL: результат не залежить від локалі бази.
 * Посимвольно і без зміни довжини — тож позиція збігу в searchText точно вказує місце в content для уривка.
 */

/** Символ, чия мала літера довша (İ → i̇), лишається як є, щоб позиції не зсувались */
export const foldCase = (s: string) =>
  Array.from(s, (c) => {
    const low = c.toLowerCase();
    return Array.from(low).length === 1 ? low : c;
  }).join('');

export const searchTextOf = (name: string, description: string | null, content: string | null) => foldCase(`${name}\n${description ?? ''}\n${content ?? ''}`);

/** Запит людини: один рядок, без зайвих пробілів */
export const normalizeQuery = (q: string) => q.replace(/\s+/g, ' ').trim();

/** Підрядок для LIKE: %, _ і \ — буквально */
export const likePattern = (q: string) => `%${foldCase(q).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** Де знайдено: 0 — назва, 1 — опис, 2 — текст документа */
export const MATCH_IN = ['name', 'description', 'content'] as const;
export type MatchIn = (typeof MATCH_IN)[number];

/** Скільки символів тексту довкола збігу показувати в уривку */
export const SNIPPET_AROUND = 80;
