/** Прийняті формати (ADR-0023): лише сучасні — старі .doc/.xls надійно не перевірити */
export const EXTS = ['docx', 'xlsx', 'pdf'] as const;
export type Ext = (typeof EXTS)[number];

export const isExt = (s: string): s is Ext => (EXTS as readonly string[]).includes(s);

/** Чому файл не прийнято — це й код помилки API (тексти — у client/src/shared/texts/errors.yml) */
export type Reason =
  | 'template_bad_format'
  | 'template_old_format'
  | 'template_macros'
  | 'template_external'
  | 'template_pdf_active'
  | 'template_password'
  | 'template_check_failed';

export type Verdict = { ok: true } | { ok: false; reason: Reason };

export const OK: Verdict = { ok: true };
export const fail = (reason: Reason): Verdict => ({ ok: false, reason });

/**
 * Розширення з імені файлу → прийняте розширення або причина відмови ще до перевірки вмісту.
 * Файли з макросами за назвою (.docm, .xlsm…) відхиляються як макроси, старі — з порадою зберегти по-новому.
 */
export function extOf(fileName: string): { ext: Ext } | { reason: Reason } {
  const ext = fileName.toLowerCase().match(/\.([a-z0-9]{1,5})$/)?.[1] ?? '';
  if (isExt(ext)) return { ext };
  if (['doc', 'xls', 'dot', 'xlt', 'rtf'].includes(ext)) return { reason: 'template_old_format' };
  if (['docm', 'xlsm', 'dotm', 'xltm', 'xlsb', 'xlam'].includes(ext)) return { reason: 'template_macros' };
  return { reason: 'template_bad_format' };
}
