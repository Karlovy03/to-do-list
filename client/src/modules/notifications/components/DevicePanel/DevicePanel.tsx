import { t } from '@/shared/lib/texts';
import { Button, Card, Icon } from '@/shared/ui';
import { usePushDevice } from '../../hooks/usePushDevice';
import css from './DevicePanel.module.css';

const HINT = { denied: 'denied', unsupported: 'unsupported', ios_install: 'ios_hint' } as const;

/** «Сповіщення на цьому пристрої»: стан, увімкнення, пробне сповіщення */
export function DevicePanel() {
  const { state, enable, test } = usePushDevice();
  return (
    <Card title={t('notifications.device.title')}>
      {state === 'on' ? (
        <>
          <p className={css.on}>
            <Icon name="check" size={18} />
            {t('notifications.device.enabled')}
          </p>
          <Button size="s" variant="outline" icon="bell" className={css.inline} disabled={test.isPending} onClick={() => test.mutate()}>
            {t('notifications.device.test')}
          </Button>
        </>
      ) : state === 'off' ? (
        <Button size="m" variant="primary" icon="bell" className={css.inline} disabled={enable.isPending} onClick={() => enable.mutate()}>
          {t('notifications.device.enable')}
        </Button>
      ) : (
        state && <p className={css.hint}>{t(`notifications.device.${HINT[state]}`)}</p>
      )}
    </Card>
  );
}
