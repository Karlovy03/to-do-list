import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { docx, para, pdf, simplePdf, stream, xlsx } from '../inspect/files.fixture';
import { checkBuffer, checkFile, readText, tidy } from './index';

const text = async (buf: Buffer, ext: 'docx' | 'xlsx' | 'pdf') => {
  const { verdict, doc } = await checkBuffer(buf, ext);
  expect(verdict).toEqual({ ok: true });
  return readText(buf, ext, doc);
};

describe('текст для пошуку', () => {
  it('Word: абзаци, без кодів полів; сутності XML розкодовано', async () => {
    const buf = docx(para('Рапорт про надання') + para('щорічної відпустки &amp; інше') + '<w:p><w:r><w:instrText> PAGE </w:instrText></w:r></w:p>');
    expect(await text(buf, 'docx')).toEqual({ status: 'OK', text: 'Рапорт про надання\nщорічної відпустки & інше' });
  });
  it('Excel: назва аркуша і рядки клітинок', async () => {
    expect(await text(xlsx(['Графік чергувань', 'Іваненко'], {}, 'Листопад'), 'xlsx')).toEqual({ status: 'OK', text: 'Листопад\nГрафік чергувань\nІваненко' });
  });
  it('PDF: текстовий шар сторінки', async () => {
    const r = await text(simplePdf('Duty roster for November'), 'pdf');
    expect(r.status).toBe('OK');
    expect(r.text).toContain('Duty roster for November');
  });
  it('PDF без тексту (як скан) — EMPTY', async () => {
    expect(await text(simplePdf(''), 'pdf')).toEqual({ status: 'EMPTY', text: null });
  });
  it('прибирання: \\0, табуляції, пробіли, порожні рядки', () => {
    expect(tidy('  a\u0000b\t\tc  \n\n\n d   e ')).toBe('a b c\nd e');
  });
});

describe('другий рубіж — pdf.js бачить те, що сховали від сканування байтів', () => {
  it('посилання на інший файл (GoToR) замість сайту', async () => {
    const buf = pdf([
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Annots [<< /Type /Annot /Subtype /Link /Rect [0 0 99 99] /A << /S /GoToR /F (other.pdf) /D [0 /Fit] >> >>] >>',
    ]);
    const { verdict } = await checkBuffer(buf, 'pdf');
    expect(verdict).toEqual({ ok: false, reason: 'template_external' });
  });
  it('посилання на сайт — можна', async () => {
    const buf = pdf([
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Annots [<< /Type /Annot /Subtype /Link /Rect [0 0 99 99] /A << /S /URI /URI (https://zakon.rada.gov.ua/) >> >>] >>',
      stream('', ''),
    ]);
    expect((await checkBuffer(buf, 'pdf')).verdict).toEqual({ ok: true });
  });
  it('пошкоджений PDF, який pdf.js не відкриває, — не вдалося перевірити', async () => {
    const { verdict } = await checkBuffer(Buffer.from('%PDF-1.7\ngarbage', 'latin1'), 'pdf');
    expect(verdict).toEqual({ ok: false, reason: 'template_check_failed' });
  });
});

describe('окремий процес', () => {
  const tmp = (name: string, buf: Buffer) => {
    const file = path.join(os.tmpdir(), `kt-check-${process.pid}-${name}`);
    return fs.writeFile(file, buf).then(() => file);
  };
  it('приймає звичайний файл і повертає текст і sha256', async () => {
    const r = await checkFile(await tmp('ok.docx', docx(para('Зразок рапорту'))), 'docx');
    expect(r).toMatchObject({ textStatus: 'OK', content: 'Зразок рапорту' });
    expect(r.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
  it('відхиляє файл із макросом кодом причини', async () => {
    await expect(checkFile(await tmp('m.docx', docx(para('x'), { 'word/vbaProject.bin': 'VBA' })), 'docx')).rejects.toMatchObject({ status: 400, code: 'template_macros' });
  });
  it('файла немає — вердикту немає — не приймається', async () => {
    await expect(checkFile(path.join(os.tmpdir(), 'kt-check-missing.docx'), 'docx')).rejects.toMatchObject({ code: 'template_check_failed' });
  });
}, 30_000);
