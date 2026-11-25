import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { hasText } from './texts';

const SRC = path.resolve(__dirname, '..');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts') ? [path.join(dir, e.name)] : [],
  );
}

/** Простори імен текстів — модулі, що мають теку texts/, і shared */
const namespaces = [
  'shared',
  ...fs.readdirSync(path.join(SRC, 'modules')).filter((m) => fs.existsSync(path.join(SRC, 'modules', m, 'texts'))),
];

describe('тексти', () => {
  it('кожен ключ тексту, згаданий у коді, є в YAML-файлах', () => {
    const pattern = new RegExp(`'((?:${namespaces.join('|')})\\.[a-z_]+\\.[a-z_]+)'`, 'g');
    const keys = new Set<string>();
    for (const file of walk(SRC)) for (const m of fs.readFileSync(file, 'utf8').matchAll(pattern)) keys.add(m[1]);
    expect(keys.size).toBeGreaterThan(10);
    expect([...keys].filter((k) => !hasText(k))).toEqual([]);
  });
});
