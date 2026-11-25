import { hasText, t } from '../lib/texts';
import { ApiError } from './client';

/** Людський текст для будь-якої помилки запиту */
export function errorText(err: unknown): string {
  const code = err instanceof ApiError ? err.code : 'internal';
  const key = `shared.errors.${code}`;
  return hasText(key) ? t(key) : t('shared.errors.internal');
}
