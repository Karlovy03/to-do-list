import { templatesApi } from '../api/templates.api';

/**
 * Скачати: перехід за посиланням, на яке сервер відповідає «attachment», — браузер зберігає файл
 * з українським іменем із заголовка (filename*, RFC 6266) і лишається на сторінці.
 */
export function downloadTemplate(id: string) {
  const a = document.createElement('a');
  a.href = templatesApi.fileUrl(id);
  document.body.append(a);
  a.click();
  a.remove();
}

/** PDF — у новій вкладці переглядачем браузера */
export const openTemplate = (id: string) => window.open(templatesApi.fileUrl(id, true), '_blank', 'noopener');
