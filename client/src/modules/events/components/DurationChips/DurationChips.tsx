import { useState } from 'react';
import { t } from '@/shared/lib/texts';
import { Chip, Chips, FieldGroup, Picker } from '@/shared/ui';
import { durationLabel } from '../../lib/eventTime';

const PRESETS = [15, 30, 60];
/** «Інша» — від коротких 5 хв до цілого робочого дня (межі сервера: 5–720) */
const OTHER = [5, 10, 20, 45, 90, 120, 180, 240, 300, 360, 480, 720];

/** Орієнтовна тривалість: три найчастіші капсулами, решта — у списку «Інша» */
export function DurationChips({ value, onChange }: { value: number; onChange: (min: number) => void }) {
  const [other, setOther] = useState(!PRESETS.includes(value));
  return (
    <FieldGroup label={t('events.form.duration')}>
      <Chips>
        {PRESETS.map((m) => (
          <Chip key={m} on={!other && value === m} onClick={() => { setOther(false); onChange(m); }}>
            {durationLabel(m)}
          </Chip>
        ))}
        <Chip on={other} onClick={() => setOther(true)}>{t('events.form.duration_other')}</Chip>
      </Chips>
      {other && (
        <Picker
          label={t('events.form.duration_other')}
          value={value}
          options={[...new Set([...OTHER, value])].sort((a, b) => a - b).map((m) => ({ value: m, label: durationLabel(m) }))}
          onChange={onChange}
        />
      )}
    </FieldGroup>
  );
}
