// Ворота: жоден файл коду чи стилів не довший за ліміт — великий файл ділимо за відповідальністю.
import fs from 'node:fs';
import { rootsFromArgs, walk } from './lib/walk.mjs';

const LIMIT = 300;
const roots = rootsFromArgs(['server/src', 'server/prisma', 'server/scripts', 'client/src', 'client/public', 'scripts']);
const files = walk(roots, ['.ts', '.tsx', '.css', '.js', '.mjs', '.cjs', '.yml']);

const big = files
  .map((f) => ({ f, n: fs.readFileSync(f, 'utf8').split('\n').length }))
  .filter((x) => x.n > LIMIT)
  .sort((a, b) => b.n - a.n);

if (big.length) {
  console.error(`Файли довші за ${LIMIT} рядків — розділіть за відповідальністю:`);
  for (const { f, n } of big) console.error(`  ${n}\t${f}`);
  process.exit(1);
}
console.log(`check:size — OK (${files.length} файлів, ліміт ${LIMIT})`);
