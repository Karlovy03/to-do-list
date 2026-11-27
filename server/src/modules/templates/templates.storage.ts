import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../core/config';

/*
 * Файли шаблонів на диску (ADR-0023) — єдине місце, що торкається файлової системи.
 * Файл лежить під випадковим ключем, а не під іменем від користувача: обхід шляхів неможливий,
 * а з вебу до теки доступу немає — лише через API з перевіркою входу.
 */

const KEY = /^[a-f0-9]{32}$/;
/** Недокачані й залишені файли старші за годину — сміття */
export const STALE_MS = 60 * 60_000;

const root = () => config.filesDir;

export const templatesStorage = {
  /** Куди multer пише файл, поки його перевіряють; той самий том — rename без копіювання */
  tempDir: () => path.join(root(), 'tmp'),

  ensure: () => fs.mkdir(path.join(root(), 'tmp'), { recursive: true }),

  pathOf(key: string) {
    if (!KEY.test(key)) throw new Error('storage: bad key');
    return path.join(root(), key);
  },

  /** Перевірений тимчасовий файл стає постійним під новим ключем */
  async commit(tempFile: string): Promise<string> {
    const key = randomBytes(16).toString('hex');
    await fs.rename(tempFile, path.join(root(), key));
    return key;
  },

  exists: (key: string) =>
    fs.access(templatesStorage.pathOf(key)).then(
      () => true,
      () => false,
    ),

  remove: (key: string) => fs.rm(templatesStorage.pathOf(key), { force: true }),

  /** Тимчасовий файл після будь-якого результату; після commit його вже немає — це не помилка */
  discard: (tempFile: string) => fs.rm(tempFile, { force: true }),

  /** Прибирає тимчасові файли й файли без запису в базі; known — які з ключів записані */
  async sweep(known: (keys: string[]) => Promise<Set<string>>, now = Date.now()) {
    const stale = async (file: string) => now - (await fs.stat(file)).mtimeMs > STALE_MS;
    const tmp = templatesStorage.tempDir();
    for (const f of await fs.readdir(tmp)) if (await stale(path.join(tmp, f))) await fs.rm(path.join(tmp, f), { force: true });
    const keys = (await fs.readdir(root())).filter((f) => KEY.test(f));
    const live = await known(keys);
    for (const k of keys) if (!live.has(k) && (await stale(path.join(root(), k)))) await fs.rm(path.join(root(), k), { force: true });
  },
};
