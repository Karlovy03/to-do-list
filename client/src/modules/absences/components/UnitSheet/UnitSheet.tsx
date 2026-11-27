import { useState } from 'react';
import { t } from '@/shared/lib/texts';
import type { verticalOf } from '@/shared/lib/vertical';
import { Button, Sheet, UnitPicker } from '@/shared/ui';
import type { Unit } from '@/shared/api/types';
import css from './UnitSheet.module.css';

interface Props {
  vertical: ReturnType<typeof verticalOf>;
  units: Unit[];
  unitId: string;
  sub: boolean;
  onApply: (unitId: string, sub: boolean) => void;
  onClose: () => void;
}

/** Який підрозділ рахувати — у межах вертикалі, як «Кого показати» в календарі */
export function UnitSheet({ vertical, units, onApply, onClose, ...value }: Props) {
  const [unitId, setUnitId] = useState(value.unitId);
  const [sub, setSub] = useState(value.sub);
  return (
    <Sheet
      title={t('absences.strength.unit')}
      onClose={onClose}
      footer={
        <Button variant="primary" size="l" onClick={() => onApply(unitId, sub)}>
          {t('absences.strength.show')}
        </Button>
      }
    >
      <UnitPicker vertical={vertical} units={units} unitId={unitId} sub={sub} onUnit={setUnitId} onSub={setSub} />
      <p className={css.hint}>{t('absences.strength.hint')}</p>
    </Sheet>
  );
}
