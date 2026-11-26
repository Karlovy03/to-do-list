import { useState } from 'react';
import type { Person } from '@/shared/api/types';
import { errorText } from '@/shared/api/errors';
import { useUnits } from '@/shared/api/people';
import { unitPath } from '@/shared/lib/units';
import { t } from '@/shared/lib/texts';
import { Button, Card, Empty, ErrorState, Loading, Tag } from '@/shared/ui';
import { useAdminUsers } from '../../hooks/useAdmin';
import { PersonRow } from '../PersonRow/PersonRow';
import { UserSheet } from '../UserSheet/UserSheet';

export function UsersTab() {
  const users = useAdminUsers();
  const units = useUnits();
  const [editing, setEditing] = useState<Person | null | undefined>(undefined);

  return (
    <Card
      title={t('admin.common.tab_users')}
      actions={<Button size="s" variant="primary" icon="plus" onClick={() => setEditing(null)}>{t('admin.users.add')}</Button>}
    >
      {users.isLoading ? (
        <Loading />
      ) : users.error ? (
        <ErrorState message={errorText(users.error)} onRetry={() => void users.refetch()} />
      ) : !users.data?.length ? (
        <Empty icon="users" title={t('admin.users.empty')} />
      ) : (
        <div>
          {users.data.map((u) => (
            <PersonRow
              key={u.id}
              name={u.fullName}
              note={[u.position, unitPath(u.unitId, units.data ?? []), u.login].filter(Boolean).join(' · ')}
              inactive={!u.isActive}
              onClick={() => setEditing(u)}
              tags={
                <>
                  {u.role !== 'MEMBER' && <Tag tone={u.role === 'ADMIN' ? 'urgent' : u.role === 'DIRECTOR' ? 'sky' : 'info'}>{t(`admin.roles.${u.role}`)}</Tag>}
                  {u.role === 'MANAGER' && !u.unitId && u.isActive && <Tag tone="late">{t('admin.users.no_unit_tag')}</Tag>}
                  {!u.isActive && <Tag tone="neutral">{t('admin.common.inactive')}</Tag>}
                </>
              }
            />
          ))}
        </div>
      )}
      {editing !== undefined && <UserSheet user={editing} onClose={() => setEditing(undefined)} />}
    </Card>
  );
}
