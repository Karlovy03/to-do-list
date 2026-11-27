import { readFile } from 'node:fs/promises';
import { isExt } from '../inspect';
import { checkBuffer, readText } from './analyze';

/*
 * Дочірній процес перевірки (ADR-0023): чужий файл розбирається тут, з власною межею пам'яті й часу.
 * Спершу — вердикт (батько вирішує, чи приймати), потім — текст для пошуку.
 */

const send = (m: object) => new Promise<void>((resolve) => process.send?.(m, () => resolve()));

process.once('message', async (m: { file?: unknown; ext?: unknown }) => {
  if (typeof m.file !== 'string' || typeof m.ext !== 'string' || !isExt(m.ext)) return process.exit(2);
  // файла немає чи не читається — без вердикту батько файл не прийме
  const buf = await readFile(m.file).catch(() => process.exit(1));
  const { verdict, sha256, doc } = await checkBuffer(buf, m.ext);
  await send({ type: 'verdict', verdict, sha256 });
  if (verdict.ok) await send({ type: 'text', ...(await readText(buf, m.ext, doc)) });
  process.exit(0);
});
