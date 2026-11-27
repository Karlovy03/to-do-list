import zlib from 'node:zlib';
import { fail, OK, type Verdict } from './verdict';

/*
 * PDF (ADR-0023), перший рубіж: ключі словників, що запускають код чи несуть файли.
 * Межам потоків не довіряємо — їх можна підробити в рядку і сховати словник від сканера.
 * Тому: (1) імена шукаємо по всьому файлу; (2) кожне «stream» пробуємо розпакувати (Flate) до кінця файлу —
 * zlib сам зупиниться на кінці свого потоку — і шукаємо імена й там (стиснені «об'єктні потоки» /ObjStm).
 * Шукаємо лише довгі імена: випадкові байти стиснених даних їх не утворять (коротке /JS — утворило б;
 * а дія з кодом однаково позначена /S /JavaScript).
 * Другий рубіж — pdf.js (extract/pdf-doc.ts).
 */

/** JavaScript, запуск програм, вкладені файли, мультимедіа, XFA-форми зі скриптами, відправлення даних назовні */
const ACTIVE = new Set(['JavaScript', 'Launch', 'EmbeddedFile', 'EmbeddedFiles', 'FileAttachment', 'RichMedia', 'XFA', 'GoToE', 'ImportData', 'SubmitForm']);
/** Фільтри, яких ми не розпаковуємо: ними можна сховати об'єктний потік. Сучасні програми їх не вживають */
const OPAQUE = new Set(['ASCIIHexDecode', 'ASCII85Decode', 'LZWDecode', 'RunLengthDecode', 'Crypt']);
/** Скільки всього розпакованих байтів переглядаємо; більше — це «бомба» або щось, що не перевірити */
export const INFLATE_BUDGET = 256 << 20;
const CARRY = 128;

/** Імена PDF з розкодуванням #xx: /J#61vaScript — це /JavaScript */
export function pdfNames(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/\/([^\s()<>[\]{}/%]+)/g)) out.add(m[1].replace(/#([0-9A-Fa-f]{2})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16))));
  return out;
}

const hasActive = (text: string) => [...pdfNames(text)].some((n) => ACTIVE.has(n));

interface Budget {
  left: number;
}

/** Розпаковує потік від позиції до кінця файлу шматками і шукає активні імена; 'over' — вичерпано межу */
function scanInflated(data: Buffer, budget: Budget): Promise<'found' | 'clean' | 'over'> {
  return new Promise((resolve) => {
    const z = zlib.createInflate({ finishFlush: zlib.constants.Z_SYNC_FLUSH });
    let carry = '';
    const stop = (r: 'found' | 'clean' | 'over') => {
      z.destroy();
      resolve(r);
    };
    z.on('data', (chunk: Buffer) => {
      budget.left -= chunk.length;
      if (budget.left < 0) return stop('over');
      const text = carry + chunk.toString('latin1');
      if (hasActive(text)) return stop('found');
      carry = text.slice(-CARRY);
    });
    // не Flate (зображення, шрифти) чи кінець даних — у цьому потоці нічого
    z.on('error', () => resolve('clean'));
    z.on('end', () => resolve('clean'));
    z.end(data);
  });
}

export async function inspectPdf(buf: Buffer): Promise<Verdict> {
  const raw = buf.toString('latin1');
  const names = pdfNames(raw);
  if (names.has('Encrypt')) return fail('template_password');
  if ([...names].some((n) => ACTIVE.has(n))) return fail('template_pdf_active');
  if ([...names].some((n) => OPAQUE.has(n))) return fail('template_check_failed');
  const budget = { left: INFLATE_BUDGET };
  for (const m of raw.matchAll(/stream(?:\r\n|\r|\n)/g)) {
    const r = await scanInflated(buf.subarray(m.index + m[0].length), budget);
    if (r === 'found') return fail('template_pdf_active');
    if (r === 'over') return fail('template_check_failed');
  }
  return OK;
}
