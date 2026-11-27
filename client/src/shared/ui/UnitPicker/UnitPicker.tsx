import { headcount, verticalOf } from '../../lib/vertical';
import { pluralForm } from '../../lib/plural';
import { t } from '../../lib/texts';
import { Switch } from '../Switch';
import css from './UnitPicker.module.css';

type Vertical = ReturnType<typeof verticalOf>;

interface Props {
  vertical: Vertical;
  units: Parameters<typeof headcount>[1];
  unitId: string;
  sub: boolean;
  onUnit: (id: string) => void;
  onSub: (sub: boolean) => void;
}

/** Підрозділи вертикалі деревом і «разом із підпорядкованими» (Figma 17) — календар і «В строю» */
export function UnitPicker({ vertical, units, unitId, sub, onUnit, onSub }: Props) {
  const count = (id: string) => {
    const n = headcount(id, units, vertical.people, sub);
    return t(`shared.units.people_${pluralForm(n)}`, { n });
  };
  return (
    <>
      <div className={css.units} role="radiogroup" aria-label={t('shared.units.unit')}>
        {vertical.units.map((u) => (
          <button key={u.id} type="button" role="radio" aria-checked={u.id === unitId} className={u.id === unitId ? `${css.unit} ${css.on}` : css.unit}
            style={{ paddingLeft: `calc(var(--s-4) + ${u.depth * 16}px)` }} onClick={() => onUnit(u.id)}>
            <span className={css.radio} aria-hidden="true" />
            <span className={css.text}>
              <b>{u.name}</b>
              <small>{count(u.id)}</small>
            </span>
          </button>
        ))}
      </div>
      <Switch checked={sub} label={t('shared.units.sub')} onChange={onSub} />
    </>
  );
}
