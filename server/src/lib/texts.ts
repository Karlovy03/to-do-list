import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

/** Усі тексти сповіщень лежать у texts/notifications.yml — у коді лише ключі. */
const file = path.resolve(__dirname, '../../texts/notifications.yml');
const dict = parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;

export type TextKey = keyof typeof dict & string;

export function tx(key: string, vars: Record<string, string | number> = {}): string {
  const raw = dict[key];
  if (raw === undefined) throw new Error(`Немає тексту для ключа «${key}» у notifications.yml`);
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}
