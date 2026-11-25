import type { ControlBy, ControlInput } from '@/shared/api/types';
import { useDirectory, usePeople } from '@/shared/api/people';
import { t } from '@/shared/lib/texts';
import { Field, Input, Segmented, Select } from '@/shared/ui';
import { INTERVALS } from '../../lib/controlInput';
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
      <Field label={t('control.control.who')}>
        <Segmented<Kind>
          label={t('control.control.who')}
          value={by.type}
          onChange={(k) => set({ by: empty[k] })}
          options={(['self', 'user', 'directory', 'text'] as const).map((k) => ({ value: k, label: t(`control.control.by_${k}`) }))}
        />
      </Field>
      {by.type === 'user' && (
        <Select aria-label={t('control.control.pick_user')} value={by.userId} onChange={(e) => set({ by: { type: 'user', userId: e.target.value } })}>
          <option value="">{t('control.control.pick_user')}</option>
          {people.data?.filter((p) => p.isActive).map((p) => (
            <option key={p.id} value={p.id}>{`${p.fullName} — ${p.position}`}</option>
          ))}
        </Select>
      )}
      {by.type === 'directory' && (
        <Select aria-label={t('control.control.pick_directory')} value={by.controllerId} onChange={(e) => set({ by: { type: 'directory', controllerId: e.target.value } })}>
          <option value="">{t('control.control.pick_directory')}</option>
          {directory.data?.filter((p) => p.isActive).map((p) => (
            <option key={p.id} value={p.id}>{[p.fullName, p.position, p.organization].filter(Boolean).join(', ')}</option>
          ))}
        </Select>
      )}
      {by.type === 'text' && (
        <Input aria-label={t('control.control.by_text')} value={by.text} placeholder={t('control.control.text_placeholder')} onChange={(e) => set({ by: { type: 'text', text: e.target.value } })} />
      )}
      <Field label={t('control.control.basis')}>
        <Input value={value.basis ?? ''} placeholder={t('control.control.basis_placeholder')} onChange={(e) => set({ basis: e.target.value })} />
      </Field>
      <Field label={t('control.intervals.label')}>
        <Select value={value.reminderInterval ?? ''} onChange={(e) => set({ reminderInterval: e.target.value ? Number(e.target.value) : null })}>
          {INTERVALS.map((i) => (
            <option key={i.key} value={i.value ?? ''}>
              {i.value ? `${t('control.intervals.every')} ${t(`control.intervals.${i.key}`)}` : t('control.intervals.default')}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
