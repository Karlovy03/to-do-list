import type { TemplateExt } from '../api/templates.api';
import { EXTS } from '../api/templates.api';

/** Пошук і тип — в адресі (ADR-0022): переживають оновлення, ними можна поділитися */
export interface TemplatesParams {
  q: string;
  type: TemplateExt | '';
}

export function readTemplates(sp: URLSearchParams): TemplatesParams {
  const type = sp.get('type') ?? '';
  return { q: sp.get('q') ?? '', type: (EXTS as readonly string[]).includes(type) ? (type as TemplateExt) : '' };
}

export function writeTemplates(p: TemplatesParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (p.q) sp.set('q', p.q);
  if (p.type) sp.set('type', p.type);
  return sp;
}
