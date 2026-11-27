import { pluralForm } from '@/shared/lib/plural';
import { t } from '@/shared/lib/texts';
import type { Template } from '../api/templates.api';

/** Рядок над заголовком: «12 шаблонів · Word, Excel, PDF» або під час пошуку «Знайдено 2 · у назві й у тексті» (Figma 42, 43) */
export function eyebrowText(searching: boolean, items: Template[], total: number, hasMore: boolean): string {
  if (!searching) return t(`templates.page.count_${pluralForm(total)}`, { n: total });
  const found = t(hasMore ? 'templates.page.found_more' : 'templates.page.found', { n: items.length });
  const inText = items.some((i) => i.match?.in === 'content');
  const inName = items.some((i) => i.match && i.match.in !== 'content');
  if (inText && inName) return found + t('templates.page.found_in_both');
  if (inText) return found + t('templates.page.found_in_text');
  if (inName) return found + t('templates.page.found_in_name');
  return found;
}
