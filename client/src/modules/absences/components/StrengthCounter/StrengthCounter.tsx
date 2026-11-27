import { t } from '@/shared/lib/texts';
import { KINDS } from '../../lib/absence';
import type { Strength } from '../../lib/strength';
import css from './StrengthCounter.module.css';

const TONE = { VACATION: css.vacation, SICK_LEAVE: css.sick, FAMILY: css.family } as const;

/** «В строю / Лічильник» (Figma 89:356): 12 з 15, смуга, за видами. hideZero — на Flip нулі не показуємо (правка власника) */
export function StrengthCounter({ strength: s, hideZero }: { strength: Strength; hideZero?: boolean }) {
  const present = s.present.length;
  const kinds = KINDS.filter((k) => !hideZero || s.byKind[k] > 0);
  return (
    <section className={css.counter} aria-label={t('absences.strength.progress', { present, total: s.total })}>
      <p className={css.numbers} aria-hidden="true">
        <b className={css.present}>{present}</b>
        <span>{t('absences.strength.of', { n: s.total })}</span>
        <span>{t('absences.strength.present')}</span>
      </p>
      <div className={css.track} aria-hidden="true">
        <div className={css.fill} style={{ width: s.total ? `${(present / s.total) * 100}%` : 0 }} />
      </div>
      {kinds.length > 0 && (
        <ul className={css.kinds}>
          {kinds.map((k) => (
            <li key={k} className={`${css.kind} ${TONE[k]}`}>
              {t(`absences.kind.${k}_short`)} <b>{s.byKind[k]}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
