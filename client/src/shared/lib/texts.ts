/*
 * Тексти інтерфейсу лежать у YAML поруч із кодом:
 *   src/modules/<модуль>/texts/<група>.yml → t('<модуль>.<група>.<ключ>')
 *   src/app/texts/<група>.yml              → t('app.<група>.<ключ>')
 *   src/shared/texts/<група>.yml           → t('shared.<група>.<ключ>')
 * {n}, {time} тощо в тексті підставляються з другого аргументу.
 */
const files = import.meta.glob<Record<string, unknown>>(
  ['/src/modules/*/texts/*.yml', '/src/app/texts/*.yml', '/src/shared/texts/*.yml'],
  { eager: true, import: 'default' },
);

const dict = new Map<string, string>();
for (const [file, data] of Object.entries(files)) {
  const m = file.match(/^\/src\/(?:modules\/)?([^/]+)\/texts\/([^/]+)\.ya?ml$/);
  if (!m) continue;
  for (const [k, v] of Object.entries(data)) dict.set(`${m[1]}.${m[2]}.${k}`, String(v));
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const raw = dict.get(key);
  if (raw === undefined) {
    if (import.meta.env.DEV) console.error(`[texts] missing key "${key}"`);
    return key;
  }
  return vars ? raw.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')) : raw;
}

export const hasText = (key: string) => dict.has(key);

/** Усі ключі — для тесту, що вони існують */
export const allTextKeys = () => [...dict.keys()];
