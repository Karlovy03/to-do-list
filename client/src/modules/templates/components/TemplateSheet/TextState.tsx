import { t } from '@/shared/lib/texts';
import type { Template } from '../../api/templates.api';
import css from './TemplateSheet.module.css';

/** Чи знайдеться шаблон за текстом (Figma 45 і «Що погоджуємо», п. 5) */
export function TextState({ tpl }: { tpl: Template }) {
  if (tpl.textStatus === 'OK') return <p className={`${css.state} ${css.ok}`}>{t('templates.card.text_ok')}</p>;
  const key = tpl.textStatus === 'FAILED' ? 'text_failed' : tpl.ext === 'pdf' ? 'text_scan' : 'text_empty';
  return <p className={`${css.state} ${css.no}`}>{t(`templates.card.${key}`)}</p>;
}
