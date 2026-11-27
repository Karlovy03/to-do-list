import { t } from '@/shared/lib/texts';
import css from './Legend.module.css';

const ITEMS = [
  { key: 'event', swatch: css.event },
  { key: 'past', swatch: css.past },
  { key: 'task', swatch: css.task, wideOnly: true },
  { key: 'soon', swatch: css.soon },
  { key: 'late', swatch: css.late },
  { key: 'control', swatch: css.control },
  { key: 'absent', swatch: css.absent },
];

/** Що означають кольори сітки; на телефоні — без пояснення «від постановки до терміну» */
export function Legend({ wide }: { wide: boolean }) {
  return (
    <ul className={css.legend} aria-label={t('calendar.legend.label')}>
      {ITEMS.filter((i) => wide || !i.wideOnly).map((i) => (
        <li key={i.key}>
          <span className={`${css.swatch} ${i.swatch}`} aria-hidden="true" />
          {t(`calendar.legend.${i.key}`)}
        </li>
      ))}
    </ul>
  );
}
