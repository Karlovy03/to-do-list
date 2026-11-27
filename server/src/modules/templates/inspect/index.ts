import { inspectOoxml } from './ooxml';
import { inspectPdf } from './pdf';
import { fail, type Ext, type Verdict } from './verdict';
import { readZipDirectory } from './zip';

export { extOf, isExt, EXTS, type Ext, type Reason, type Verdict } from './verdict';
export { readZipDirectory, readEntry } from './zip';
export { PART_MAX } from './ooxml';

const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const OLE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const PDF = Buffer.from('%PDF-', 'latin1');
/** Зашифрований Office-файл — це контейнер OLE з потоком EncryptedPackage (ім'я в UTF-16LE) */
const ENCRYPTED = Buffer.from('EncryptedPackage', 'utf16le');

const startsWith = (buf: Buffer, sig: Buffer) => buf.subarray(0, sig.length).equals(sig);

/**
 * Перевірка вмісту за байтами, а не за розширенням чи типом від браузера (OWASP).
 * Розширення має збігатися з сигнатурою; далі — правила формату.
 */
export async function inspectFile(buf: Buffer, ext: Ext): Promise<Verdict> {
  if (startsWith(buf, OLE)) {
    if (ext === 'pdf') return fail('template_bad_format');
    return fail(buf.includes(ENCRYPTED) ? 'template_password' : 'template_old_format');
  }
  if (ext === 'pdf') return startsWith(buf, PDF) ? inspectPdf(buf) : fail('template_bad_format');
  if (!startsWith(buf, ZIP)) return fail('template_bad_format');
  const dir = readZipDirectory(buf);
  return dir.ok ? inspectOoxml(buf, dir.entries, ext) : dir;
}
