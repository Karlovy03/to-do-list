import { useState } from 'react';
import { useDescribePerson, usePeople, useUnits } from '@/shared/api/people';
import type { Me } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { Button, PeoplePicker, Segmented, Sheet, UnitPicker } from '@/shared/ui';
import type { Filter } from '../../lib/params';
import type { Mode } from '../../lib/range';
import { verticalOf } from '@/shared/lib/vertical';
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
        <UnitPicker vertical={vertical} units={units.data ?? []} unitId={unitId} sub={sub} onUnit={setUnitId} onSub={setSub} />
      )}

      {kind === 'person' && (
        <PeoplePicker people={vertical.people} selected={personId ? [personId] : []} onChange={(ids) => setPersonId(ids[0] ?? '')} multiple={false}
          describe={describe} unitId={me.unitId} placeholder={t('calendar.filters.search')} />
      )}

      <p className={css.hint}>{t('calendar.filters.hint')}</p>
    </Sheet>
  );
}
