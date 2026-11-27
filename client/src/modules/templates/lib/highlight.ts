/** Нижній регістр посимвольно, без зміни довжини — як на сервері: позиції збігу збігаються з оригіналом */
export const foldCase = (s: string) =>
  Array.from(s, (c) => {
    const low = c.toLowerCase();
    return Array.from(low).length === 1 ? low : c;
  }).join('');

export interface Segment {
  text: string;
  hit: boolean;
}

/** Розбиває текст на шматки зі збігами запиту (без урахування регістру) — для підсвітки без вставки HTML */
export function segments(text: string, query: string): Segment[] {
  const q = Array.from(foldCase(query.trim()));
  if (!q.length) return [{ text, hit: false }];
  const chars = Array.from(text);
  const low = Array.from(foldCase(text));
  const out: Segment[] = [];
  let from = 0;
  for (let i = 0; i <= low.length - q.length; ) {
    if (q.every((c, k) => low[i + k] === c)) {
      if (i > from) out.push({ text: chars.slice(from, i).join(''), hit: false });
      out.push({ text: chars.slice(i, i + q.length).join(''), hit: true });
      i += q.length;
      from = i;
    } else i++;
  }
  if (from < chars.length) out.push({ text: chars.slice(from).join(''), hit: false });
  return out;
}
