import { fail, OK, type Verdict } from './verdict';
import { readEntry, type ZipEntry } from './zip';

/*
 * .docx/.xlsx (ADR-0023): «дозволено лише відоме» — відхиляється все, що може виконати код
 * чи потягнути щось ззовні, навіть якщо антивірус про це ще не знає.
 */

export const PART_MAX = 24 << 20;
const RELS_MAX = 1 << 20;

const MAIN = { docx: 'word/document.xml', xlsx: 'xl/workbook.xml' } as const;

/** Частини, що несуть код: VBA, макроаркуші Excel 4.0, діалоги, елементи ActiveX */
const ACTIVE = [/(^|\/)vbaproject\.bin$/, /(^|\/)vbadata\.xml$/, /^xl\/macrosheets\//, /^xl\/dialogsheets\//, /(^|\/)activex\//];

/** Вбудовані файли: дозволені лише документи без макросів і зображення (графіки Word зберігають дані як .xlsx) */
const EMBEDDED = /(^|\/)embeddings\//;
const EMBEDDED_OK = /\.(docx|xlsx|pptx|png|jpe?g|gif|bmp|emf|wmf|tiff?)$/;

/** Зовнішні зв'язки Excel: посилання на інші книги (у т. ч. DDE) і підключення до даних */
const EXTERNAL_PARTS = [/^xl\/externallinks\//, /^xl\/connections\.xml$/, /^xl\/querytables\//];

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`))?.[1] ?? '';

/** Зв'язок із зовнішньою адресою, крім звичайного посилання: підкинутий шаблон, OLE-об'єкт, джерело злиття, зображення */
export function hasExternalRelationship(relsXml: string): boolean {
  for (const tag of relsXml.match(/<Relationship\b[^>]*>/g) ?? []) {
    if (attr(tag, 'TargetMode').toLowerCase() !== 'external') continue;
    if (!attr(tag, 'Type').endsWith('/hyperlink')) return true;
  }
  return false;
}

/** Коди полів частини Word; код поля ділять на шматки між run-ами, тож склеюємо їх */
export function fieldCodes(xml: string): string {
  let codes = '';
  for (const m of xml.matchAll(/<w:instrText\b[^>]*>([^<]*)<\/w:instrText>/g)) codes += m[1];
  for (const m of xml.matchAll(/<w:fldSimple\b[^>]*\bw:instr\s*=\s*"([^"]*)"/g)) codes += ` ${m[1]} `;
  return codes;
}

/** Поле DDE/DDEAUTO запускає програму */
export const hasDde = (codes: string) => /\bDDE(AUTO)?\b/i.test(codes);

export function inspectOoxml(buf: Buffer, entries: ZipEntry[], ext: 'docx' | 'xlsx'): Verdict {
  const byName = new Map(entries.map((e) => [e.name.toLowerCase(), e]));
  const names = [...byName.keys()];
  if (!byName.has(MAIN[ext]) || !byName.has('[content_types].xml')) return fail('template_bad_format');
  if (names.some((n) => ACTIVE.some((r) => r.test(n)) || (EMBEDDED.test(n) && !EMBEDDED_OK.test(n)))) return fail('template_macros');
  if (names.some((n) => EXTERNAL_PARTS.some((r) => r.test(n)))) return fail('template_external');

  const read = (name: string, max: number) => readEntry(buf, byName.get(name)!, max).toString('utf8');
  try {
    if (/macroenabled/i.test(read('[content_types].xml', RELS_MAX))) return fail('template_macros');
    for (const n of names.filter((x) => x.endsWith('.rels'))) if (hasExternalRelationship(read(n, RELS_MAX))) return fail('template_external');
    if (ext === 'docx') {
      let codes = '';
      for (const n of names) if (n.startsWith('word/') && n.endsWith('.xml')) codes += fieldCodes(read(n, PART_MAX));
      if (hasDde(codes)) return fail('template_macros');
    }
  } catch {
    return fail('template_check_failed');
  }
  return OK;
}
