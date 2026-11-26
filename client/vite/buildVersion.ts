import type { Plugin } from 'vite';

/**
 * Номер збірки: вшивається в код (__BUILD_ID__) і кладеться поруч у version.json.
 * Відкритий давно додаток порівнює їх і пропонує оновитися (app/update).
 */
export function buildVersion(): Plugin {
  const id = Date.now().toString(36);
  return {
    name: 'build-version',
    config: () => ({ define: { __BUILD_ID__: JSON.stringify(id) } }),
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id }) });
    },
  };
}
