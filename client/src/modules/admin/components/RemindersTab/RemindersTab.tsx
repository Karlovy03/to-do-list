import { useState } from 'react';
import type { ReminderSettings } from '@/shared/api/types';
import { errorText } from '@/shared/api/errors';
import { t } from '@/shared/lib/texts';
import { Button, Card, ErrorState, Field, Loading, Picker, Switch } from '@/shared/ui';
import { useReminderSettings, useSaveSettings } from '../../hooks/useAdmin';
import { CONTROL_INTERVALS, DEADLINE_OFFSETS, OVERDUE_REPEATS } from '../../lib/options';
import { OptionChips } from '../OptionChips/OptionChips';
import css from './RemindersTab.module.css';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({ value: h, label: `${String(h).padStart(2, '0')}:00` }));

export function RemindersTab() {
  const q = useReminderSettings();
  if (q.isLoading) return <Loading />;
  if (!q.data) return <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />;
  return <RemindersForm initial={q.data} />;
}

/** Загальні правила нагадувань і типові «тихі години» для нових користувачів */
function RemindersForm({ initial }: { initial: ReminderSettings }) {
  const save = useSaveSettings();
  const [v, setV] = useState(initial);
  const set = (patch: Partial<ReminderSettings>) => setV((x) => ({ ...x, ...patch }));
  const toggleOffset = (m: number) =>
    set({ deadlineOffsetsMin: v.deadlineOffsetsMin.includes(m) ? v.deadlineOffsetsMin.filter((x) => x !== m) : [...v.deadlineOffsetsMin, m].sort((a, b) => b - a) });
  const hour = (field: 'defaultQuietFrom' | 'defaultQuietTo', label: string) => (
    <Field label={label}>
      <Picker label={label} value={v[field]} options={HOUR_OPTIONS} onChange={(h) => set({ [field]: h })} />
    </Field>
  );

  return (
    <div className={css.form}>
      <div className={css.columns}>
        <Card title={t('admin.reminders.for_all')}>
          <OptionChips label={t('admin.reminders.control_interval')} options={CONTROL_INTERVALS} selected={[v.controlIntervalMin]} onToggle={(m) => set({ controlIntervalMin: m })} />
          <OptionChips label={t('admin.reminders.deadline_offsets')} options={DEADLINE_OFFSETS} selected={v.deadlineOffsetsMin} onToggle={toggleOffset} />
          <OptionChips label={t('admin.reminders.overdue_repeat')} options={OVERDUE_REPEATS} selected={[v.overdueRepeatMin]} onToggle={(m) => set({ overdueRepeatMin: m })} />
          <Switch checked={v.urgentBypassQuiet} label={t('admin.reminders.urgent_bypass')} onChange={(x) => set({ urgentBypassQuiet: x })} />
          <Switch checked={v.overdueNotifyLeads} label={t('admin.reminders.overdue_author')} onChange={(x) => set({ overdueNotifyLeads: x })} />
        </Card>
        <Card title={t('admin.reminders.defaults_new')}>
          <div className={css.hours}>
            {hour('defaultQuietFrom', t('admin.reminders.quiet_from'))}
            {hour('defaultQuietTo', t('admin.reminders.quiet_to'))}
          </div>
          <Switch checked={v.defaultMuteWeekends} label={t('admin.reminders.weekends')} onChange={(x) => set({ defaultMuteWeekends: x })} />
          <p className={css.hint}>{t('admin.reminders.defaults_hint')}</p>
        </Card>
      </div>
      <Button variant="primary" size="l" icon="check" className={css.save} disabled={save.isPending} onClick={() => save.mutate(v)}>
        {t('app.common.save')}
      </Button>
    </div>
  );
}
