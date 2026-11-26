import { useState } from 'react';
import { t } from '@/shared/lib/texts';
import { Button, Icon, IconButton } from '@/shared/ui';
import { usePushDevice } from '../../hooks/usePushDevice';
import css from './PushBanner.module.css';

const KEY = 'kt_push_banner_hidden';

function hiddenThisSession() {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** Плаваюча підказка після входу: увімкнути сповіщення або (iPhone) додати застосунок на екран «Додому» */
export function PushBanner() {
  const { state, enable } = usePushDevice();
  const [hidden, setHidden] = useState(hiddenThisSession);
  if (hidden || (state !== 'off' && state !== 'ios_install')) return null;

  const hide = () => {
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* сховище недоступне — сховається лише до перезавантаження */
    }
    setHidden(true);
  };
  const ios = state === 'ios_install';

  return (
    <aside className={css.banner} role="status" data-print="hide">
      <span className={css.icon}>
        <Icon name="bell" size={22} />
      </span>
      <div className={css.text}>
        <b>{t(ios ? 'notifications.banner.ios_title' : 'notifications.banner.title')}</b>
        <span>{t(ios ? 'notifications.banner.ios_text' : 'notifications.banner.text')}</span>
        {!ios && (
          <Button variant="primary" size="s" icon="bell" className={css.action} disabled={enable.isPending} onClick={() => enable.mutate()}>
            {t('notifications.banner.enable')}
          </Button>
        )}
      </div>
      <IconButton icon="x" tone="sunken" label={t('notifications.banner.later')} onClick={hide} />
    </aside>
  );
}
