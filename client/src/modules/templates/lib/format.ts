import type { Template, TemplateExt } from '../api/templates.api';
import { shortName } from '@/shared/lib/names';
import { t } from '@/shared/lib/texts';

/** Нерозривний пробіл (правка власника у Figma 42): «48 КБ» і «· Бондар А.» не розриваються переносом */
const NB = ' ';
const KB = 1024;
const MB = KB * KB;

/** «48 КБ», «1,2 МБ» */
export function sizeText(bytes: number): string {
  if (bytes < KB) return `${bytes}${NB}${t('templates.row.bytes')}`;
  if (bytes < MB) return `${Math.round(bytes / KB)}${NB}${t('templates.row.kb')}`;
  return `${(bytes / MB).toFixed(1).replace('.', ',').replace(/,0$/, '')}${NB}${t('templates.row.mb')}`;
}

const dayMonth = new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', day: '2-digit', month: '2-digit' });
const withYear = new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', day: '2-digit', month: '2-digit', year: 'numeric' });
const yearOf = (d: Date) => new Intl.DateTimeFormat('en', { timeZone: 'Europe/Kyiv', year: 'numeric' }).format(d);

/** «27.11»; не цього року — «27.11.2025» */
export function shortDay(iso: string, now = new Date()): string {
  const d = new Date(iso);
  return (yearOf(d) === yearOf(now) ? dayMonth : withYear).format(d);
}

/** «Відділ аналітики · Бондар А. · 27.11 · 48 КБ» — роздільник тримається попереднього слова */
export const metaLine = (tpl: Template, now = new Date()) =>
  [tpl.unit?.name, tpl.uploadedBy && shortName(tpl.uploadedBy.fullName), shortDay(tpl.createdAt, now), sizeText(tpl.size)].filter(Boolean).join(`${NB}· `);

export const typeLabel = (ext: TemplateExt) => t(`templates.types.${ext}`);

/** Назва за замовчуванням — з імені файлу: без розширення, «_» як пробіл */
export const nameFromFile = (fileName: string) =>
  fileName.replace(/\.[^.]*$/, '').replace(/_+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);

export const MAX_FILE_BYTES = 20 * MB;

/**
 * Що не так із файлом ще до надсилання — той самий код, що повернув би сервер (тексти спільні).
 * Остаточно вирішує сервер: тут лише розширення й розмір.
 */
export function fileProblem(file: { name: string; size: number }): string | null {
  const ext = file.name.toLowerCase().match(/\.([a-z0-9]{1,5})$/)?.[1] ?? '';
  if (['doc', 'xls', 'dot', 'xlt', 'rtf'].includes(ext)) return 'template_old_format';
  if (['docm', 'xlsm', 'dotm', 'xltm', 'xlsb', 'xlam'].includes(ext)) return 'template_macros';
  if (!['docx', 'xlsx', 'pdf'].includes(ext)) return 'template_bad_format';
  if (file.size > MAX_FILE_BYTES) return 'template_too_large';
  return null;
}

export const extOfName = (fileName: string): TemplateExt | null => {
  const ext = fileName.toLowerCase().match(/\.([a-z0-9]{1,5})$/)?.[1];
  return ext === 'docx' || ext === 'xlsx' || ext === 'pdf' ? ext : null;
};
