import { t } from '@/shared/lib/texts';
import type { TemplateExt } from '../../api/templates.api';
import css from './TypeBadge.module.css';

/** Позначка типу файлу (Figma «Шаблон / Тип файлу»): W — синя, X — зелена, PDF — малинова */
export function TypeBadge({ ext, small }: { ext: TemplateExt; small?: boolean }) {
  return (
    <span className={[css.badge, css[ext], small && css.small].filter(Boolean).join(' ')} aria-label={t(`templates.types.${ext}`)}>
      {t(`templates.types.${ext}_mark`)}
    </span>
  );
}
