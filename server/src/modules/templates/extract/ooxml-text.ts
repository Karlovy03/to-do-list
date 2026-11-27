import { PART_MAX, readEntry, readZipDirectory } from '../inspect';

/*
 * Текст із .docx/.xlsx для пошуку — власним кодом, без бібліотек: частини XML уже перевірені й обмежені за розміром.
 */

const ENTITIES: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };

export function decodeXml(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|lt|gt|amp|quot|apos);/g, (_, e: string) => {
    if (e[0] !== '#') return ENTITIES[e];
    const code = e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  });
}

function partsOf(buf: Buffer) {
  const dir = readZipDirectory(buf);
  if (!dir.ok) throw new Error('zip: unreadable');
  const byName = new Map(dir.entries.map((e) => [e.name.toLowerCase(), e]));
  return {
    names: [...byName.keys()],
    read: (name: string) => {
      const e = byName.get(name);
      return e ? readEntry(buf, e, PART_MAX).toString('utf8') : '';
    },
  };
}

/** Абзаци Word: лише видимий текст (w:t), без кодів полів і видаленого; спершу документ, далі колонтитули */
export function docxText(buf: Buffer): string {
  const { names, read } = partsOf(buf);
  const parts = ['word/document.xml', ...names.filter((n) => /^word\/(header|footer)\d*\.xml$/.test(n))];
  let out = '';
  for (const name of parts) {
    for (const m of read(name).matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>|<\/w:p>/g)) {
      if (m[1] !== undefined) out += decodeXml(m[1]);
      else out += m[0] === '<w:tab/>' ? ' ' : '\n';
    }
    out += '\n';
  }
  return out;
}

const runs = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g)].map((m) => decodeXml(m[1])).join('');

/** Книга Excel: назви аркушів, спільні рядки клітинок і рядки, вписані прямо в аркуш */
export function xlsxText(buf: Buffer): string {
  const { names, read } = partsOf(buf);
  const lines = [...read('xl/workbook.xml').matchAll(/<sheet\b[^>]*\bname="([^"]*)"/g)].map((m) => decodeXml(m[1]));
  for (const m of read('xl/sharedstrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)) lines.push(runs(m[1]));
  for (const sheet of names.filter((n) => /^xl\/worksheets\/[^/]+\.xml$/.test(n))) {
    for (const m of read(sheet).matchAll(/<is>([\s\S]*?)<\/is>/g)) lines.push(runs(m[1]));
  }
  return lines.join('\n');
}
