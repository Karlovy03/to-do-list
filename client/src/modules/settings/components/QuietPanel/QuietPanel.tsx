import type { Me } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { Card, Field, Picker, Switch } from '@/shared/ui';
import { useUpdatePrefs } from '../../hooks/useProfile';
import css from './QuietPanel.module.css';

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const HOUR_OPTIONS = HOURS.map((h) => ({ value: h, label: `${String(h).padStart(2, '0')}:00` }));

/** «Не турбувати»: тихі години і вихідні */
export function QuietPanel({ me }: { me: Me }) {
  const update = useUpdatePrefs(me);
  const hourSelect = (field: 'quietFrom' | 'quietTo') => (
    <Field label={t(`settings.quiet.${field === 'quietFrom' ? 'from' : 'to'}`)}>
      <Picker label={t(`settings.quiet.${field === 'quietFrom' ? 'from' : 'to'}`)} value={me.prefs[field]} options={HOUR_OPTIONS} onChange={(h) => update({ [field]: h })} />
    </Field>
  );
  return (
    <Card title={t('settings.quiet.title')}>
      <div className={css.hours}>
        {hourSelect('quietFrom')}
        {hourSelect('quietTo')}
      </div>
      <Switch checked={me.prefs.muteWeekends} label={t('settings.quiet.weekends')} onChange={(v) => update({ muteWeekends: v })} />
      <p className={css.hint}>{t('settings.quiet.hint')}</p>
    </Card>
  );
}
