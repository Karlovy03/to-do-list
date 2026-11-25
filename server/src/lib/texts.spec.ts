import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { hasText } from './texts';

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.ts') ? [path.join(dir, e.name)] : [],
  );
}

describe('тексти', () => {
  it('кожен ключ, згаданий у коді, є в YAML-файлах', () => {
    const keys = new Set<string>();
    for (const file of walk(path.resolve(__dirname, '..'))) {
      for (const m of fs.readFileSync(file, 'utf8').matchAll(/'((?:notifications|shared|[a-z]+)\.[a-z_]+\.[a-z_]+)'/g)) keys.add(m[1]);
    }
    expect(keys.size).toBeGreaterThan(10);
    expect([...keys].filter((k) => !hasText(k))).toEqual([]);
  });
});
