import zlib from 'node:zlib';

/*
 * Тестові файли для перевірок (лише для *.spec.ts; у збірку не потрапляє — див. tsconfig exclude).
 * Збираються в коді, щоб у репозиторії не лежали двійкові файли з «макросами».
 */

type Parts = Record<string, string | Buffer>;

/** ZIP з deflate; encrypted — позначка шифрування запису (біт 0) */
export function zip(parts: Parts, opts: { encrypted?: boolean } = {}): Buffer {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(parts)) {
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const packed = zlib.deflateRawSync(data);
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = zlib.crc32(data);
    const flags = opts.encrypted ? 1 : 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(flags, 8);
    cen.writeUInt16LE(8, 10);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(packed.length, 20);
    cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28);
    cen.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, packed);
    central.push(cen, nameBuf);
    offset += 30 + nameBuf.length + packed.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(parts).length, 8);
  end.writeUInt16LE(Object.keys(parts).length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const S = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const PKG_RELS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const DOC_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
export const DOCX_MAIN = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml';
export const DOCM_MAIN = 'application/vnd.ms-word.document.macroEnabled.main+xml';

const types = (main: string, partName: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="${partName}" ContentType="${main}"/></Types>`;

export const rels = (items: { type: string; target: string; external?: boolean }[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${PKG_RELS}">` +
  items.map((r, i) => `<Relationship Id="rId${i + 1}" Type="${DOC_REL}/${r.type}" Target="${r.target}"${r.external ? ' TargetMode="External"' : ''}/>`).join('') +
  `</Relationships>`;

export const para = (text: string) => `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;

/** Поле: код ділиться на шматки між run-ами, як це робить Word */
export const field = (...codeParts: string[]) =>
  `<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r>${codeParts.map((c) => `<w:r><w:instrText xml:space="preserve">${c}</w:instrText></w:r>`).join('')}<w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>`;

export function docx(body: string, extra: Parts = {}, main = DOCX_MAIN): Buffer {
  return zip({
    '[Content_Types].xml': types(main, '/word/document.xml'),
    '_rels/.rels': rels([{ type: 'officeDocument', target: 'word/document.xml' }]),
    'word/document.xml': `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="${W}"><w:body>${body}</w:body></w:document>`,
    ...extra,
  });
}

export function xlsx(strings: string[], extra: Parts = {}, sheetName = 'Sheet1'): Buffer {
  return zip({
    '[Content_Types].xml': types('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml', '/xl/workbook.xml'),
    '_rels/.rels': rels([{ type: 'officeDocument', target: 'xl/workbook.xml' }]),
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="${S}" xmlns:r="${DOC_REL}"><sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': rels([{ type: 'worksheet', target: 'worksheets/sheet1.xml' }, { type: 'sharedStrings', target: 'sharedStrings.xml' }]),
    'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${S}"><sheetData>${strings.map((_, i) => `<row r="${i + 1}"><c r="A${i + 1}" t="s"><v>${i}</v></c></row>`).join('')}</sheetData></worksheet>`,
    'xl/sharedStrings.xml': `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="${S}">${strings.map((s) => `<si><t>${s}</t></si>`).join('')}</sst>`,
    ...extra,
  });
}

export const stream = (dict: string, data: string | Buffer) => {
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data, 'latin1');
  return Buffer.concat([Buffer.from(`<< ${dict} /Length ${bytes.length} >>\nstream\n`, 'latin1'), bytes, Buffer.from('\nendstream', 'latin1')]);
};

/** PDF із правильною таблицею xref; об'єкт 1 — каталог. Тексти сторінок — латиницею (стандартний шрифт) */
export function pdf(objects: (string | Buffer)[], trailerExtra = ''): Buffer {
  const chunks: Buffer[] = [Buffer.from('%PDF-1.7\n', 'latin1')];
  const offsets: number[] = [];
  let pos = chunks[0].length;
  objects.forEach((o, i) => {
    const body = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, 'latin1'), Buffer.isBuffer(o) ? o : Buffer.from(o, 'latin1'), Buffer.from('\nendobj\n', 'latin1')]);
    offsets.push(pos);
    chunks.push(body);
    pos += body.length;
  });
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  chunks.push(Buffer.from(`${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R ${trailerExtra}>>\nstartxref\n${pos}\n%%EOF\n`, 'latin1'));
  return Buffer.concat(chunks);
}

/** Звичайний односторінковий PDF з текстом; extra — додаткові об'єкти з номера 6, catalogExtra — ключі каталогу */
export function simplePdf(text: string, opts: { catalogExtra?: string; extra?: (string | Buffer)[]; trailerExtra?: string } = {}): Buffer {
  return pdf(
    [
      `<< /Type /Catalog /Pages 2 0 R ${opts.catalogExtra ?? ''}>>`,
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
      stream('', `BT /F1 18 Tf 72 700 Td (${text}) Tj ET`),
      ...(opts.extra ?? []),
    ],
    opts.trailerExtra,
  );
}
