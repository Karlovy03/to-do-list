import type { Me } from '@/shared/api/types';
import { IntervalChips } from '@/modules/control';
import { t } from '@/shared/lib/texts';
import { Card, Switch } from '@/shared/ui';
import { useUpdatePrefs } from '../../hooks/useProfile';

const TOPICS = [
  ['notifyAssigned', 'assigned'],
  ['notifyControl', 'control'],
  ['notifyDeadline', 'deadline'],
  ['notifyUpdates', 'updates'],
  ['notifyEvents', 'events'],
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
        <IntervalChips
          label={t('settings.topics.my_interval')}
          defaultLabel={t('settings.topics.my_interval_default')}
          value={me.prefs.controlInterval}
          onChange={(controlInterval) => update({ controlInterval })}
        />
      )}
    </Card>
  );
}
