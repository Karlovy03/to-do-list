import { useState } from 'react';
import type { DirectoryPerson } from '@/shared/api/types';
import { errorText } from '@/shared/api/errors';
import { t } from '@/shared/lib/texts';
import { Button, Card, Empty, ErrorState, Loading, Tag } from '@/shared/ui';
import { useAdminDirectory } from '../../hooks/useAdmin';
import { PersonRow } from '../PersonRow/PersonRow';
import { PersonSheet } from '../PersonSheet/PersonSheet';
import css from './DirectoryTab.module.css';

export function DirectoryTab() {
  const list = useAdminDirectory();
  const [editing, setEditing] = useState<DirectoryPerson | null | undefined>(undefined);

  return (
    <Card
      title={t('admin.common.tab_directory')}
      actions={<Button size="s" variant="primary" icon="plus" onClick={() => setEditing(null)}>{t('admin.directory.add')}</Button>}
    >
      <p className={css.hint}>{t('admin.directory.hint')}</p>
      {list.isLoading ? (
        <Loading />
      ) : list.error ? (
        <ErrorState message={errorText(list.error)} onRetry={() => void list.refetch()} />
      ) : !list.data?.length ? (
        <Empty icon="shield" title={t('admin.directory.empty')} />
      ) : (
        <div>
          {list.data.map((p) => (
            <PersonRow
              key={p.id}
              name={p.fullName}
              note={[p.position, p.organization].filter(Boolean).join(', ')}
              inactive={!p.isActive}
              onClick={() => setEditing(p)}
              tags={!p.isActive && <Tag tone="neutral">{t('admin.common.inactive')}</Tag>}
            />
          ))}
        </div>
      )}
      {editing !== undefined && <PersonSheet person={editing} onClose={() => setEditing(undefined)} />}
    </Card>
  );
}
