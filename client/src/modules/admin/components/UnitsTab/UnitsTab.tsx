import { useState } from 'react';
import type { Unit } from '@/shared/api/types';
import { errorText } from '@/shared/api/errors';
import { useUnits } from '@/shared/api/people';
import { pluralForm } from '@/shared/lib/plural';
import { t } from '@/shared/lib/texts';
import { flattenTree } from '@/shared/lib/units';
import { Button, Card, Empty, ErrorState, Icon, IconButton, Loading } from '@/shared/ui';
import { UnitSheet } from '../UnitSheet/UnitSheet';
import css from './UnitsTab.module.css';

type Editing = { unit: Unit | null; parentId?: string | null } | null;

/** Дерево підрозділів: відступ — рівень вкладеності; «+» на рядку — вкладений підрозділ */
export function UnitsTab() {
  const units = useUnits();
  const [editing, setEditing] = useState<Editing>(null);
  const rows = flattenTree(units.data ?? []);

  return (
    <Card
      title={t('admin.units.title')}
      actions={<Button size="s" variant="primary" icon="plus" onClick={() => setEditing({ unit: null, parentId: null })}>{t('admin.units.add')}</Button>}
    >
      <p className={css.hint}>{t('admin.units.hint')}</p>
      {units.isLoading ? (
        <Loading />
      ) : units.error ? (
        <ErrorState message={errorText(units.error)} onRetry={() => void units.refetch()} />
      ) : rows.length === 0 ? (
        <Empty icon="list" title={t('admin.units.empty')} />
      ) : (
        <ul className={css.tree}>
          {rows.map((u) => (
            <li key={u.id} className={css.row} style={{ ['--depth' as string]: u.depth }}>
              <button type="button" className={css.main} onClick={() => setEditing({ unit: u })}>
                {u.depth > 0 && <span className={css.branch} aria-hidden="true" />}
                <span className={css.name}>{u.name}</span>
                <span className={css.count}>
                  <Icon name="users" size={14} />
                  {`${u.users} ${t(`admin.units.people_${pluralForm(u.users)}`)}`}
                </span>
              </button>
              <IconButton icon="plus" tone="sunken" label={t('admin.units.add_child')} onClick={() => setEditing({ unit: null, parentId: u.id })} />
            </li>
          ))}
        </ul>
      )}
      {editing && <UnitSheet unit={editing.unit} parentId={editing.parentId} units={units.data ?? []} onClose={() => setEditing(null)} />}
    </Card>
  );
}
