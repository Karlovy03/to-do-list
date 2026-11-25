import type { Me } from '@/shared/api/types';
import { INTERVALS } from '@/modules/control';
import { t } from '@/shared/lib/texts';
import { Card, Field, Select, Switch } from '@/shared/ui';
import { useUpdatePrefs } from '../../hooks/useProfile';

const TOPICS = [
  ['notifyAssigned', 'assigned'],
  ['notifyControl', 'control'],
  ['notifyDeadline', 'deadline'],
  ['notifyUpdates', 'updates'],
] as const;

/** Про що сповіщати і як часто нагадувати мені по контрольних */
export function TopicsPanel({ me }: { me: Me }) {
  const update = useUpdatePrefs(me);
  return (
    <Card title={t('settings.topics.title')}>
      {TOPICS.map(([field, key]) => (
        <Switch key={field} checked={me.prefs[field]} label={t(`settings.topics.${key}`)} onChange={(v) => update({ [field]: v })} />
      ))}
      {me.prefs.notifyControl && (
        <Field label={t('settings.topics.my_interval')}>
          <Select value={me.prefs.controlInterval ?? ''} onChange={(e) => update({ controlInterval: e.target.value ? Number(e.target.value) : null })}>
            {INTERVALS.map((i) => (
              <option key={i.key} value={i.value ?? ''}>
                {i.value ? `${t('control.intervals.every')} ${t(`control.intervals.${i.key}`)}` : t('settings.topics.my_interval_default')}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </Card>
  );
}
