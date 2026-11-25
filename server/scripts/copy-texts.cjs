// tsc не копіює YAML — переносимо тексти в dist з тією ж структурою папок
const fs = require('node:fs');
const path = require('node:path');
const src = path.resolve(__dirname, '../src');
const dist = path.resolve(__dirname, '../dist');
fs.cpSync(src, dist, { recursive: true, filter: (p) => fs.statSync(p).isDirectory() || /\.ya?ml$/.test(p) });
