import { useState } from 'react';
import type { Person, Role } from '@/shared/api/types';
import { errorText } from '@/shared/api/errors';
import { t } from '@/shared/lib/texts';
import { Button, Field, FormError, Input, Select, Sheet, Switch } from '@/shared/ui';
import type { UserInput } from '../../api/admin.api';
import { useSaveUser } from '../../hooks/useAdmin';

const ROLES: Role[] = ['MEMBER', 'MANAGER', 'ADMIN'];

/** Новий користувач або редагування; порожній пароль при редагуванні — без змін */
export function UserSheet({ user, onClose }: { user: Person | null; onClose: () => void }) {
  const save = useSaveUser();
  const [v, setV] = useState<UserInput>({ login: user?.login ?? '', fullName: user?.fullName ?? '', position: user?.position ?? '', role: user?.role ?? 'MEMBER', isActive: user?.isActive ?? true, password: '' });
  const set = (patch: Partial<UserInput>) => setV((x) => ({ ...x, ...patch }));
  const submit = () => {
    const input = { ...v, login: v.login.trim(), fullName: v.fullName.trim(), position: v.position.trim(), password: v.password || undefined };
    if (!user) delete input.isActive;
    save.mutate({ id: user?.id, input }, { onSuccess: onClose });
  };

  return (
    <Sheet
      title={user ? t('admin.users.edit') : t('admin.users.add')}
      onClose={onClose}
      footer={
        <Button variant="primary" size="l" block disabled={save.isPending} onClick={submit}>
          {t('app.common.save')}
        </Button>
      }
    >
      <Field label={t('admin.users.full_name')}>
        <Input autoFocus value={v.fullName} onChange={(e) => set({ fullName: e.target.value })} />
      </Field>
      <Field label={t('admin.users.position')}>
        <Input value={v.position} onChange={(e) => set({ position: e.target.value })} />
      </Field>
      <Field label={t('admin.users.login')}>
        <Input autoCapitalize="none" autoComplete="off" value={v.login} onChange={(e) => set({ login: e.target.value })} />
      </Field>
      <Field label={t('admin.users.password')} hint={user ? t('admin.users.password_keep') : undefined}>
        <Input type="password" autoComplete="new-password" value={v.password} onChange={(e) => set({ password: e.target.value })} />
      </Field>
      <Field label={t('admin.users.role')}>
        <Select value={v.role} onChange={(e) => set({ role: e.target.value as Role })}>
          {ROLES.map((r) => (
            <option key={r} value={r}>{t(`admin.roles.${r}`)}</option>
          ))}
        </Select>
      </Field>
      {user && <Switch checked={!!v.isActive} label={t('admin.common.is_active')} onChange={(isActive) => set({ isActive })} />}
      <FormError>{save.error ? errorText(save.error) : null}</FormError>
    </Sheet>
  );
}
