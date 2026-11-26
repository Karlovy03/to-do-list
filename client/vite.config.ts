import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { parse } from 'yaml';
import { appTexts } from './vite/appTexts';
import { buildVersion } from './vite/buildVersion';

// Тексти інтерфейсу — YAML-файли в папках модулів; на збірці стають JSON-модулями
const yamlTexts = {
  name: 'yaml-texts',
  transform(code: string, id: string) {
    if (!/\.ya?ml$/.test(id)) return null;
    return { code: `export default ${JSON.stringify(parse(code) ?? {})};`, map: null };
  },
};

export default defineConfig({
  plugins: [react(), yamlTexts, appTexts(), buildVersion()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    port: 5173,
    host: '0.0.0.0',
    // Host не підміняємо: сервер звіряє Origin із Host (захист від CSRF)
    proxy: { '/api': { target: process.env.API_TARGET ?? 'http://localhost:3101', changeOrigin: false } },
  },
});
