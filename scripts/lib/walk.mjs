import fs from 'node:fs';
import path from 'node:path';

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', 'android', 'ios', 'migrations', 'coverage']);

/** Усі файли з потрібними розширеннями під заданими коренями (без залежностей і збірок) */
export function walk(roots, exts) {
  const out = [];
  const visit = (dir) => {
    if (!fs.existsSync(dir)) return;
    if (fs.statSync(dir).isFile()) {
      if (exts.some((x) => dir.endsWith(x))) out.push(dir);
      return;
    }
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) visit(p);
      } else if (exts.some((x) => e.name.endsWith(x))) {
        out.push(p);
      }
    }
  };
  roots.forEach(visit);
  return out;
}

/** Корені перевірки: аргументи командного рядка або типові теки пакетів */
export const rootsFromArgs = (defaults) => (process.argv.length > 2 ? process.argv.slice(2) : defaults);
