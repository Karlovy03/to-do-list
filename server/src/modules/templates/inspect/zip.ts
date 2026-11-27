import zlib from 'node:zlib';
import type { Reason } from './verdict';

/*
 * Мінімальний читач ZIP для .docx/.xlsx: каталог читається без розпакування,
 * окрема частина розпаковується з межею розміру — «zip-бомба» не роздує пам'ять.
 * ZIP64 і шифровані записи не підтримуються: у шаблонах до 20 МБ їх не буває, а перевірити їх не можна.
 */

export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  size: number;
  offset: number;
}

export const MAX_ENTRIES = 2000;
const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;
const U32_MAX = 0xffffffff;

export type ZipDirectory = { ok: true; entries: ZipEntry[] } | { ok: false; reason: Reason };

const broken = { ok: false, reason: 'template_check_failed' } as const;

function findEnd(buf: Buffer) {
  const stop = Math.max(0, buf.length - 22 - 0xffff);
  for (let i = buf.length - 22; i >= stop; i--) if (buf.readUInt32LE(i) === EOCD) return i;
  return -1;
}

export function readZipDirectory(buf: Buffer): ZipDirectory {
  const end = findEnd(buf);
  if (end < 0) return broken;
  const count = buf.readUInt16LE(end + 10);
  const size = buf.readUInt32LE(end + 12);
  const start = buf.readUInt32LE(end + 16);
  if (count > MAX_ENTRIES || start === U32_MAX || start + size > end) return broken;
  const entries: ZipEntry[] = [];
  let p = start;
  for (let i = 0; i < count; i++) {
    if (p + 46 > end || buf.readUInt32LE(p) !== CENTRAL) return broken;
    const flags = buf.readUInt16LE(p + 8);
    if (flags & 1) return { ok: false, reason: 'template_password' };
    const nameLen = buf.readUInt16LE(p + 28);
    const entry = {
      method: buf.readUInt16LE(p + 10),
      compressedSize: buf.readUInt32LE(p + 20),
      size: buf.readUInt32LE(p + 24),
      offset: buf.readUInt32LE(p + 42),
      name: buf.toString('utf8', p + 46, p + 46 + nameLen),
    };
    if (entry.compressedSize === U32_MAX || entry.size === U32_MAX || entry.offset === U32_MAX) return broken;
    entries.push(entry);
    p += 46 + nameLen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return { ok: true, entries };
}

/** Вміст частини; більше за maxBytes, невідоме стиснення чи пошкоджені дані — виняток */
export function readEntry(buf: Buffer, e: ZipEntry, maxBytes: number): Buffer {
  const o = e.offset;
  if (o + 30 > buf.length || buf.readUInt32LE(o) !== LOCAL) throw new Error('zip: bad local header');
  const from = o + 30 + buf.readUInt16LE(o + 26) + buf.readUInt16LE(o + 28);
  const data = buf.subarray(from, from + e.compressedSize);
  if (e.method === 0) {
    if (data.length > maxBytes) throw new Error('zip: entry too large');
    return data;
  }
  if (e.method !== 8) throw new Error('zip: unsupported method');
  return zlib.inflateRawSync(data, { maxOutputLength: maxBytes });
}
