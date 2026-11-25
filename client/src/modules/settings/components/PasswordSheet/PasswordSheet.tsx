import { useState } from 'react';
import { errorText } from '@/shared/api/errors';
import { t } from '@/shared/lib/texts';
import { Button, Field, FormError, Input, Sheet } from '@/shared/ui';
import { useChangePassword } from '../../hooks/useProfile';

export function PasswordSheet({ onClose }: { onClose: () => void }) {
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const save = () => change.mutate({ current, next }, { onSuccess: onClose });
  return (
    <Sheet
      title={t('settings.password.title')}
      onClose={onClose}
      footer={
        <Button variant="primary" size="l" block disabled={change.isPending || !current || next.length < 8} onClick={save}>
          {t('app.common.save')}
        </Button>
      }
    >
      <Field label={t('settings.password.current')}>
        <Input type="password" autoComplete="current-password" autoFocus value={current} onChange={(e) => setCurrent(e.target.value)} />
      </Field>
      <Field label={t('settings.password.next')}>
        <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
      </Field>
      <FormError>{change.error ? errorText(change.error) : null}</FormError>
    </Sheet>
  );
}
