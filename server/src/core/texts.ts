import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

/*
 * Тексти лежать у YAML-файлах поруч із модулями:
 *   src/modules/<модуль>/texts/<група>.yml  → ключ «<модуль>.<група>.<ключ>»
 *   src/shared/texts/<група>.yml            → ключ «shared.<група>.<ключ>»
 * У коді — лише ключі: tx('notifications.control.reminder').
 */
const root = path.resolve(__dirname, '..');
const dict = new Map<string, string>();

function loadDir(dir: string, ns: string) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    if (!/\.ya?ml$/.test(file)) continue;
    const group = file.replace(/\.ya?ml$/, '');
    const data = parse(fs.readFileSync(path.join(dir, file), 'utf8')) as Record<string, string>;
    for (const [k, v] of Object.entries(data ?? {})) dict.set(`${ns}.${group}.${k}`, String(v));
  }
}

const modules = path.join(root, 'modules');
for (const m of fs.readdirSync(modules)) loadDir(path.join(modules, m, 'texts'), m);
loadDir(path.join(root, 'shared', 'texts'), 'shared');

export function tx(key: string, vars: Record<string, string | number> = {}): string {
  const raw = dict.get(key);
  if (raw === undefined) throw new Error(`Missing text for key "${key}"`);
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

export const hasText = (key: string) => dict.has(key);
