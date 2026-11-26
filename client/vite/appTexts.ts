import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import type { Plugin } from 'vite';

/**
 * Назва застосунку в index.html і маніфесті береться з src/app/texts/common.yml,
 * щоб жоден текст інтерфейсу не жив поза YAML (ворота check:texts).
 */
const COLORS = { background: '#0E2357', theme: '#0E2357' };

function names(root: string) {
  const file = path.join(root, 'src/app/texts/common.yml');
  const yml = parse(fs.readFileSync(file, 'utf8')) as { name: string; tagline: string };
  return { name: yml.name, title: `${yml.name} — ${yml.tagline}` };
}

function manifest(root: string) {
  const n = names(root);
  return JSON.stringify({
    name: n.title,
    short_name: n.name,
    id: '/',
    lang: 'uk',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: COLORS.background,
    theme_color: COLORS.theme,
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  }, null, 2);
}

export function appTexts(): Plugin {
  let root = process.cwd();
  return {
    name: 'app-texts',
    configResolved(c) {
      root = c.root;
    },
    transformIndexHtml(html) {
      const n = names(root);
      return html.replaceAll('%APP_NAME%', n.name).replaceAll('%APP_TITLE%', n.title).replaceAll('%THEME_COLOR%', COLORS.theme);
    },
    configureServer(server) {
      server.middlewares.use('/manifest.webmanifest', (_req, res) => {
        res.setHeader('Content-Type', 'application/manifest+json');
        res.end(manifest(root));
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: manifest(root) });
    },
  };
}
