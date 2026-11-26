import type { ControlBy, ControlInput } from '@/shared/api/types';
import { useDirectory, usePeople } from '@/shared/api/people';
import { t } from '@/shared/lib/texts';
import { Field, FieldGroup, Input, Picker, Segmented } from '@/shared/ui';
import { IntervalChips } from '../IntervalChips/IntervalChips';
import css from './ControlFields.module.css';

type Kind = ControlBy['type'];

const empty: Record<Kind, ControlBy> = {
  self: { type: 'self' },
  user: { type: 'user', userId: '' },
  directory: { type: 'directory', controllerId: '' },
  text: { type: 'text', text: '' },
};

/** Хто поставив на контроль (я / користувач / довідник / інша особа), підстава, інтервал нагадувань */
export function ControlFields({ value, onChange }: { value: ControlInput; onChange: (v: ControlInput) => void }) {
  const people = usePeople();
  const directory = useDirectory();
  const set = (patch: Partial<ControlInput>) => onChange({ ...value, ...patch });
  const by = value.by;

  return (
    <div className={css.fields}>
      <FieldGroup label={t('control.control.who')}>
        <Segmented<Kind>
          label={t('control.control.who')}
          value={by.type}
          onChange={(k) => set({ by: empty[k] })}
          options={(['self', 'user', 'directory', 'text'] as const).map((k) => ({ value: k, label: t(`control.control.by_${k}`) }))}
        />
      </FieldGroup>
      {by.type === 'user' && (
        <Picker
          searchable
          label={t('control.control.pick_user')}
          placeholder={t('control.control.pick_user')}
          value={by.userId}
          onChange={(userId) => set({ by: { type: 'user', userId } })}
          options={(people.data ?? []).filter((p) => p.isActive).map((p) => ({ value: p.id, label: p.fullName, hint: p.position }))}
        />
      )}
      {by.type === 'directory' && (
        <Picker
          searchable
          label={t('control.control.pick_directory')}
          placeholder={t('control.control.pick_directory')}
          value={by.controllerId}
          onChange={(controllerId) => set({ by: { type: 'directory', controllerId } })}
          options={(directory.data ?? [])
            .filter((p) => p.isActive)
            .map((p) => ({ value: p.id, label: p.fullName, hint: [p.position, p.organization].filter(Boolean).join(', ') }))}
        />
      )}
      {by.type === 'text' && (
        <Input aria-label={t('control.control.by_text')} value={by.text} placeholder={t('control.control.text_placeholder')} onChange={(e) => set({ by: { type: 'text', text: e.target.value } })} />
      )}
      <Field label={t('control.control.basis')}>
        <Input value={value.basis ?? ''} placeholder={t('control.control.basis_placeholder')} onChange={(e) => set({ basis: e.target.value })} />
      </Field>
      <IntervalChips label={t('control.intervals.label')} value={value.reminderInterval ?? null} onChange={(reminderInterval) => set({ reminderInterval })} />
    </div>
  );
}
