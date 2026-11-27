import { useState } from 'react';
import type { Me } from '@/shared/api/types';
import { isNoGlass, setNoGlass } from '@/shared/lib/appearance';
import { t } from '@/shared/lib/texts';
import { Card, Switch } from '@/shared/ui';
import { useUpdatePrefs } from '../../hooks/useProfile';

/**
 * «Без прозорості» — на цьому пристрої; ящірка «Виконано!» — у профілі,
 * тож вимкнена на телефоні не з'явиться й на комп'ютері (ADR-0018)
 */
export function AppearancePanel({ me }: { me: Me }) {
  const [on, setOn] = useState(isNoGlass);
  const update = useUpdatePrefs(me);
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
      <Switch
        checked={me.prefs.cheerOnControlDone}
        label={t('settings.appearance.cheer')}
        hint={t('settings.appearance.cheer_hint')}
        onChange={(cheerOnControlDone) => update({ cheerOnControlDone })}
      />
    </Card>
  );
}
