import { useMemo, useState } from 'react';
import type { Unit } from '@/shared/api/types';
import { errorText } from '@/shared/api/errors';
import { t } from '@/shared/lib/texts';
import { subtree, unitPath } from '@/shared/lib/units';
import { Button, Field, FormError, Input, Picker, Sheet } from '@/shared/ui';
import { useRemoveUnit, useSaveUnit } from '../../hooks/useAdmin';
import css from './UnitSheet.module.css';

const ROOT = '';

interface Props {
  /** редагування — підрозділ; новий — null */
  unit: Unit | null;
  /** для нового: у який підрозділ додати */
  parentId?: string | null;
  units: Unit[];
  onClose: () => void;
}

/** Підрозділ: назва і куди входить; власного нащадка батьком обрати не можна (інакше цикл) */
export function UnitSheet({ unit, parentId = null, units, onClose }: Props) {
  const save = useSaveUnit();
  const remove = useRemoveUnit();
  const [name, setName] = useState(unit?.name ?? '');
  const [parent, setParent] = useState<string>(unit?.parentId ?? parentId ?? ROOT);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const options = useMemo(() => {
    const blocked = unit ? subtree(unit.id, units) : new Set<string>();
    return [
      { value: ROOT, label: t('admin.units.no_parent') },
      ...units.filter((u) => !blocked.has(u.id)).map((u) => ({ value: u.id, label: unitPath(u.id, units) })).sort((a, b) => a.label.localeCompare(b.label, 'uk')),
    ];
  }, [unit, units]);
  const empty = !unit || (unit.users === 0 && unit.children === 0);
  const error = save.error ?? remove.error;

  const submit = () => save.mutate({ id: unit?.id, input: { name: name.trim(), parentId: parent || null } }, { onSuccess: onClose });

  return (
    <Sheet
      title={unit ? t('admin.units.edit') : t('admin.units.add')}
      onClose={onClose}
      footer={
        <Button variant="primary" size="l" block disabled={save.isPending || name.trim().length < 2} onClick={submit}>
          {t('app.common.save')}
        </Button>
      }
    >
      <Field label={t('admin.units.name')}>
        <Input autoFocus value={name} placeholder={t('admin.units.name_placeholder')} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label={t('admin.units.parent')}>
        <Picker searchable label={t('admin.units.parent')} value={parent} options={options} onChange={setParent} />
      </Field>
      {unit && (
        <div className={css.danger}>
          {!empty ? (
            <p className={css.hint}>{t('admin.units.not_empty')}</p>
          ) : confirmDelete ? (
            <>
              <p className={css.warning}>{t('admin.units.delete_warning')}</p>
              <Button variant="danger" size="m" icon="x" disabled={remove.isPending} onClick={() => remove.mutate(unit.id, { onSuccess: onClose })}>
                {t('admin.units.delete')}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="m" icon="x" onClick={() => setConfirmDelete(true)}>
              {t('admin.units.delete')}
            </Button>
          )}
        </div>
      )}
      <FormError>{error ? errorText(error) : null}</FormError>
    </Sheet>
  );
}
