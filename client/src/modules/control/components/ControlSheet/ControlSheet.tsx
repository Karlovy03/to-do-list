import { useState } from 'react';
import type { ControlInput, TaskControl } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { Button, FormError, Sheet } from '@/shared/ui';
import { fromControl, isComplete, normalize } from '../../lib/controlInput';
import { ControlFields } from '../ControlFields/ControlFields';

interface Props {
  initial: TaskControl | null;
  busy?: boolean;
  onClose: () => void;
  onSave: (v: ControlInput) => void;
}

/** Постановка на контроль або зміна умов уже наявного */
export function ControlSheet({ initial, busy, onClose, onSave }: Props) {
  const [value, setValue] = useState(() => fromControl(initial));
  const [error, setError] = useState<string | null>(null);
  const save = () => (isComplete(value) ? onSave(normalize(value)) : setError(t('control.control.need_who')));

  return (
    <Sheet
      title={initial ? t('control.control.change') : t('control.control.set')}
      onClose={onClose}
      footer={
        <Button variant="primary" size="l" block disabled={busy} onClick={save}>
          {initial ? t('control.control.change') : t('control.control.set')}
        </Button>
      }
    >
      <ControlFields value={value} onChange={setValue} />
      <FormError>{error}</FormError>
    </Sheet>
  );
}
