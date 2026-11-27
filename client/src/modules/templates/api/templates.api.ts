import { api, ApiError, apiErrorOf, authInit, UNAUTHORIZED_EVENT, url } from '@/shared/api/client';
import type { Page, Person } from '@/shared/api/types';

export const EXTS = ['docx', 'xlsx', 'pdf'] as const;
export type TemplateExt = (typeof EXTS)[number];
export type TextStatus = 'OK' | 'EMPTY' | 'FAILED';

export interface Template {
  id: string;
  name: string;
  description: string | null;
  ext: TemplateExt;
  size: number;
  textStatus: TextStatus;
  createdAt: string;
  unit: { id: string; name: string } | null;
  uploadedBy: Person | null;
  can: { change: boolean };
  /** лише в результатах пошуку: де знайдено; для тексту — уривок довкола збігу */
  match: { in: 'name' | 'description' | 'content'; snippet: string | null; lead: boolean; tail: boolean } | null;
}

export interface TemplatePage extends Page<Template> {
  /** скільки шаблонів у бібліотеці загалом */
  total: number;
}

export interface TemplateFields {
  name?: string;
  description?: string;
}

export const templateKeys = {
  all: ['templates'] as const,
  list: (q: string, type: string) => ['templates', 'list', q, type] as const,
};

/** Файл — через XMLHttpRequest: лише він показує хід надсилання; вхід — той самий, що й у решти запитів */
function send(method: 'POST' | 'PUT', path: string, file: File, fields: TemplateFields, onProgress: (share: number) => void): Promise<Template> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) if (v !== undefined) form.append(k, v);
    form.append('file', file);
    const { headers, credentials } = authInit();
    const xhr = new XMLHttpRequest();
    xhr.open(method, url(path));
    xhr.withCredentials = credentials !== 'omit';
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      let data: unknown = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* без тіла */
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data as Template);
      if (xhr.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      reject(apiErrorOf(xhr.status, data));
    };
    xhr.onerror = () => reject(new ApiError(0, 'offline'));
    xhr.send(form);
  });
}

export const templatesApi = {
  list: (q: string, type: TemplateExt | '', offset: number) => api<TemplatePage>('/templates', { query: { q, type, offset } }),
  update: (id: string, changes: { name?: string; description?: string | null }) => api<Template>(`/templates/${id}`, { method: 'PATCH', body: changes }),
  remove: (id: string) => api<void>(`/templates/${id}`, { method: 'DELETE' }),
  upload: (file: File, fields: TemplateFields, onProgress: (share: number) => void) => send('POST', '/templates', file, fields, onProgress),
  replace: (id: string, file: File, onProgress: (share: number) => void) => send('PUT', `/templates/${id}/file`, file, {}, onProgress),
  /** Браузер іде з cookie, тож звичайне посилання скачує файл; inline — відкрити PDF у новій вкладці */
  fileUrl: (id: string, inline = false) => url(`/templates/${id}/file`, inline ? { inline: 1 } : undefined),
};
