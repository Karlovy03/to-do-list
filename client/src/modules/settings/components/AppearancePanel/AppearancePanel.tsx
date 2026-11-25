import { useState } from 'react';
import { isNoGlass, setNoGlass } from '@/shared/lib/appearance';
import { t } from '@/shared/lib/texts';
import { Card, Switch } from '@/shared/ui';

/** «Без прозорості» — вибір зберігається на цьому пристрої */
export function AppearancePanel() {
  const [on, setOn] = useState(isNoGlass);
  return (
    <Card title={t('settings.appearance.title')}>
      <Switch
        checked={on}
        label={t('settings.appearance.no_glass')}
        hint={t('settings.appearance.no_glass_hint')}
        onChange={(v) => {
          setNoGlass(v);
          setOn(v);
        }}
      />
    </Card>
  );
}
