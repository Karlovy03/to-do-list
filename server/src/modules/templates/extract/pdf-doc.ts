import { fail, OK, type Verdict } from '../inspect/verdict';

/*
 * PDF через pdf.js (unpdf): другий рубіж перевірки і текст для пошуку.
 * pdf.js розбирає об'єкти так само, як переглядач, тож бачить і те, що сховали від простого сканування байтів.
 */

/** Текстовий шар — з перших сторінок: шаблон рідко довший, а пам'ять дочірнього процесу обмежена */
export const PDF_PAGES = 50;
/** Скільки сторінок перевіряти на дії й анотації з кодом */
const PDF_CHECK_PAGES = 500;

interface TextItem {
  str?: string;
  hasEOL?: boolean;
}

/** Що pdf.js повідомляє про анотацію: код дій, ціль посилання (у т. ч. Launch/GoToR — ім'я файлу), вкладений файл */
interface Annotation {
  actions?: unknown;
  unsafeUrl?: string;
  file?: unknown;
}

interface PdfPage {
  getTextContent(): Promise<{ items: TextItem[] }>;
  getJSActions(): Promise<unknown>;
  getAnnotations(): Promise<Annotation[]>;
}

export interface PdfDoc {
  numPages: number;
  getPage(n: number): Promise<PdfPage>;
  hasJSActions(): Promise<boolean>;
  getAttachments(): Promise<unknown>;
  destroy(): Promise<void>;
}

const present = (x: unknown) => !!x && (typeof x !== 'object' || Object.keys(x).length > 0);

/** Посилання дозволені лише на веб і пошту; ціль-файл означає запуск програми чи відкриття чужого файлу */
const WEB = /^(https?:|mailto:)/i;

export async function openPdf(buf: Buffer): Promise<PdfDoc> {
  const { getDocumentProxy } = await import('unpdf');
  // серверна збірка pdf.js в unpdf не компілює код зі шрифтів (немає new Function — шлях CVE-2024-4367 відсутній)
  const doc = await getDocumentProxy(new Uint8Array(buf), { disableFontFace: true, verbosity: 0 });
  return doc as unknown as PdfDoc;
}

/**
 * Код на рівні документа (дія відкриття, іменовані скрипти, поля форм), дії сторінок, вкладені файли,
 * посилання на файли замість сайтів. Без увімкнених скриптів pdf.js самого коду не віддає — лише факт:
 * сторінка з діями повертає не null, документ — hasJSActions.
 */
export async function inspectPdfDoc(doc: PdfDoc): Promise<Verdict> {
  if ((await doc.hasJSActions()) || present(await doc.getAttachments())) return fail('template_pdf_active');
  for (let n = 1; n <= Math.min(doc.numPages, PDF_CHECK_PAGES); n++) {
    const page = await doc.getPage(n);
    if ((await page.getJSActions()) !== null) return fail('template_pdf_active');
    for (const a of await page.getAnnotations()) {
      if (present(a.actions) || present(a.file)) return fail('template_pdf_active');
      if (a.unsafeUrl && !WEB.test(a.unsafeUrl)) return fail('template_external');
    }
  }
  return OK;
}

export async function pdfText(doc: PdfDoc): Promise<string> {
  let out = '';
  for (let n = 1; n <= Math.min(doc.numPages, PDF_PAGES); n++) {
    const { items } = await (await doc.getPage(n)).getTextContent();
    for (const it of items) out += (it.str ?? '') + (it.hasEOL ? '\n' : '');
    out += '\n';
  }
  return out;
}
