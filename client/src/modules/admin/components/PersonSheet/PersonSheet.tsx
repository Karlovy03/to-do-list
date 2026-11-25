import { useState } from 'react';
import type { DirectoryPerson } from '@/shared/api/types';
import { errorText } from '@/shared/api/errors';
import { t } from '@/shared/lib/texts';
import { Button, Field, FormError, Input, Sheet, Switch } from '@/shared/ui';
import type { PersonInput } from '../../api/admin.api';
import { useSavePerson } from '../../hooks/useAdmin';

/** Особа довідника контролерів (без акаунта в системі) */
export function PersonSheet({ person, onClose }: { person: DirectoryPerson | null; onClose: () => void }) {
  const save = useSavePerson();
  const [v, setV] = useState<PersonInput>({ fullName: person?.fullName ?? '', position: person?.position ?? '', organization: person?.organization ?? '', isActive: person?.isActive ?? true });
  const set = (patch: Partial<PersonInput>) => setV((x) => ({ ...x, ...patch }));
  const submit = () => {
    const input = { ...v, fullName: v.fullName.trim(), position: v.position.trim(), organization: v.organization.trim() };
    if (!person) delete input.isActive;
    save.mutate({ id: person?.id, input }, { onSuccess: onClose });
  };

  return (
    <Sheet
      title={person ? t('admin.directory.edit') : t('admin.directory.add')}
      onClose={onClose}
      footer={
        <Button variant="primary" size="l" block disabled={save.isPending} onClick={submit}>
          {t('app.common.save')}
        </Button>
      }
    >
      <Field label={t('admin.directory.full_name')}>
        <Input autoFocus value={v.fullName} onChange={(e) => set({ fullName: e.target.value })} />
      </Field>
      <Field label={t('admin.directory.position')}>
        <Input value={v.position} onChange={(e) => set({ position: e.target.value })} />
      </Field>
      <Field label={t('admin.directory.organization')}>
        <Input value={v.organization} onChange={(e) => set({ organization: e.target.value })} />
      </Field>
      {person && <Switch checked={!!v.isActive} label={t('admin.directory.is_active')} onChange={(isActive) => set({ isActive })} />}
      <FormError>{save.error ? errorText(save.error) : null}</FormError>
    </Sheet>
  );
}
