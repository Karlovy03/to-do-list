import { createHash } from 'node:crypto';
import { docxText, xlsxText } from '../extract/ooxml-text';
import { inspectPdfDoc, openPdf, pdfText, type PdfDoc } from '../extract/pdf-doc';
import { inspectFile, type Ext, type Verdict } from '../inspect';

export type TextStatus = 'OK' | 'EMPTY' | 'FAILED';

/** Скільки тексту зберігаємо для пошуку */
export const TEXT_MAX = 200_000;

/** Перевірка вмісту; для PDF — ще й другий рубіж через pdf.js (документ повертається для читання тексту) */
export async function checkBuffer(buf: Buffer, ext: Ext): Promise<{ verdict: Verdict; sha256: string; doc: PdfDoc | null }> {
  const sha256 = createHash('sha256').update(buf).digest('hex');
  const verdict = await inspectFile(buf, ext);
  if (!verdict.ok || ext !== 'pdf') return { verdict, sha256, doc: null };
  try {
    const doc = await openPdf(buf);
    return { verdict: await inspectPdfDoc(doc), sha256, doc };
  } catch {
    // pdf.js не відкрив файл — переглядач теж не відкриє, а перевірити його ми не змогли
    return { verdict: { ok: false, reason: 'template_check_failed' }, sha256, doc: null };
  }
}

const LONE_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g;

/** Текст для пошуку: без керівних символів (PostgreSQL не приймає \0), зайвих пробілів і порожніх рядків */
export function tidy(raw: string): string {
  return raw
    .replace(LONE_SURROGATE, '')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f ]+/g, ' ')
    .split('\n')
    .map((l) => l.replace(/ {2,}/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, TEXT_MAX);
}

export async function readText(buf: Buffer, ext: Ext, doc: PdfDoc | null): Promise<{ status: TextStatus; text: string | null }> {
  try {
    const raw = ext === 'docx' ? docxText(buf) : ext === 'xlsx' ? xlsxText(buf) : doc ? await pdfText(doc) : '';
    const text = tidy(raw);
    return text ? { status: 'OK', text } : { status: 'EMPTY', text: null };
  } catch {
    return { status: 'FAILED', text: null };
  }
}
