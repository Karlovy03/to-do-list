// Ворота: у коді (.ts/.tsx/.css/.js) немає кириличного тексту поза коментарями.
// Тексти інтерфейсу й сповіщень живуть лише в YAML у теках texts/ модулів.
// Тестові файли (*.spec.*) не перевіряються — назви тестів пишемо українською.
import fs from 'node:fs';
import { rootsFromArgs, walk } from './lib/walk.mjs';

const CYRILLIC = /[Ѐ-ӿ]/;
const roots = rootsFromArgs(['server/src', 'server/prisma', 'client/src', 'client/public', 'client/index.html']);
const files = walk(roots, ['.ts', '.tsx', '.css', '.js', '.mjs', '.html', '.webmanifest']).filter((f) => !/\.spec\.[jt]sx?$/.test(f));

/** Прибирає коментарі, зберігаючи нумерацію рядків */
function stripComments(src, isCss) {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  if (!isCss) out = out.replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
  out = out.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  return out;
}

const problems = [];
for (const file of files) {
  const lines = stripComments(fs.readFileSync(file, 'utf8'), file.endsWith('.css')).split('\n');
  lines.forEach((line, i) => {
    if (CYRILLIC.test(line)) problems.push(`${file}:${i + 1}: ${line.trim().slice(0, 100)}`);
  });
}

if (problems.length) {
  console.error(`Кирилиця поза YAML (${problems.length}) — перенесіть текст у texts/*.yml модуля:`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`check:texts — OK (${files.length} файлів)`);
