import { useState } from 'react';
import { useDescribePerson, usePeople, useUnits } from '@/shared/api/people';
import type { Me } from '@/shared/api/types';
import { pluralForm } from '@/shared/lib/plural';
import { t } from '@/shared/lib/texts';
import { Button, PeoplePicker, Segmented, Sheet, Switch } from '@/shared/ui';
import type { Filter } from '../../lib/params';
import type { Mode } from '../../lib/range';
import { headcount, verticalOf } from '../../lib/vertical';
import css from './FilterSheet.module.css';

type Kind = Filter['kind'];

interface Props {
  me: Me;
  mode: Mode;
  value: Filter;
  onApply: (f: Filter) => void;
  onClose: () => void;
}

/** «Кого показати» (Figma 17): мене, підрозділ (з підпорядкованими) або людину — у межах вертикалі */
export function FilterSheet({ me, mode, value, onApply, onClose }: Props) {
  const units = useUnits();
  const people = usePeople();
  const describe = useDescribePerson();
  const vertical = verticalOf(me, units.data ?? [], people.data ?? []);
  const [kind, setKind] = useState<Kind>(value.kind);
  const [unitId, setUnitId] = useState(value.kind === 'unit' ? value.unitId : me.unitId ?? '');
  const [sub, setSub] = useState(value.kind === 'unit' ? value.sub : true);
  const [personId, setPersonId] = useState(value.kind === 'person' ? value.personId : '');

  // у «Тижні» рядки — дні однієї людини, тож підрозділ не пропонуємо
  const kinds: Kind[] = mode === 'week' ? ['me', 'person'] : ['me', 'unit', 'person'];
  const next: Filter | null = kind === 'me' ? { kind } : kind === 'unit' ? (unitId ? { kind, unitId, sub } : null) : personId ? { kind, personId } : null;
  const count = (id: string) => {
    const n = headcount(id, units.data ?? [], vertical.people, sub);
    return t(`calendar.filters.people_${pluralForm(n)}`, { n });
  };

  return (
    <Sheet
      title={t('calendar.filters.title')}
      onClose={onClose}
      footer={
        <Button variant="primary" size="l" disabled={!next} onClick={() => next && onApply(next)}>
          {t('calendar.filters.show')}
        </Button>
      }
    >
      <Segmented<Kind> label={t('calendar.filters.title')} value={kind} onChange={setKind} options={kinds.map((k) => ({ value: k, label: t(`calendar.filters.${k}`) }))} />

      {kind === 'unit' && (
        <>
          <div className={css.units} role="radiogroup" aria-label={t('calendar.filters.unit')}>
            {vertical.units.map((u) => (
              <button key={u.id} type="button" role="radio" aria-checked={u.id === unitId} className={u.id === unitId ? `${css.unit} ${css.on}` : css.unit}
                style={{ paddingLeft: `calc(var(--s-4) + ${u.depth * 16}px)` }} onClick={() => setUnitId(u.id)}>
                <span className={css.radio} aria-hidden="true" />
                <span className={css.text}>
                  <b>{u.name}</b>
                  <small>{count(u.id)}</small>
                </span>
              </button>
            ))}
          </div>
          <Switch checked={sub} label={t('calendar.filters.sub')} onChange={setSub} />
        </>
      )}

      {kind === 'person' && (
        <PeoplePicker people={vertical.people} selected={personId ? [personId] : []} onChange={(ids) => setPersonId(ids[0] ?? '')} multiple={false}
          describe={describe} unitId={me.unitId} placeholder={t('calendar.filters.search')} />
      )}

      <p className={css.hint}>{t('calendar.filters.hint')}</p>
    </Sheet>
  );
}
