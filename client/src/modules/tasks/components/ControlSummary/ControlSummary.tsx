import { Link } from 'react-router-dom';
import { pluralForm } from '@/shared/lib/plural';
import { t } from '@/shared/lib/texts';
import { formatDeadline } from '@/shared/lib/time';
import { ControlSeal, Icon } from '@/shared/ui';
import css from './ControlSummary.module.css';

/** Зведення-печатка: скільки на контролі і найближчий термін; веде до розділу «Контроль» */
export function ControlSummary({ count, nearest }: { count: number; nearest?: string }) {
  return (
    <Link to="/control" className={css.card}>
      <div className={css.text}>
        <ControlSeal />
        {count > 0 ? (
          <p className={css.count}>
            <b>{count}</b> {t(`tasks.summary.control_count_${pluralForm(count)}`)}
          </p>
        ) : (
          <p className={css.count}>{t('tasks.summary.none')}</p>
        )}
        {nearest && <p className={css.nearest}>{t('tasks.summary.nearest', { time: formatDeadline(nearest) })}</p>}
      </div>
      <Icon name="chevron" size={22} />
    </Link>
  );
}

export function FilterCapsules({ items, onPick }: { items: { id: string; label: string; count: number; tone: 'late' | 'today' | 'all' }[]; onPick: (id: string) => void }) {
  return (
    <div className={css.capsules}>
      {items.map((i) => (
        <button key={i.id} type="button" className={css.capsule} onClick={() => onPick(i.id)}>
          {i.label}
          <b className={css[i.tone]}>{i.count}</b>
        </button>
      ))}
    </div>
  );
}
