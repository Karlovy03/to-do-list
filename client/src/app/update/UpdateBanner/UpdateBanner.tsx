import { useState } from 'react';
import { t } from '@/shared/lib/texts';
import { Button, Icon, IconButton } from '@/shared/ui';
import { useNewVersion } from '../useNewVersion';
import css from './UpdateBanner.module.css';

/** Після деплою: запропонувати оновитися, але не перезавантажувати самому — людина могла щось набирати */
export function UpdateBanner() {
  const available = useNewVersion();
  const [hidden, setHidden] = useState(false);
  if (!available || hidden) return null;
  return (
    <aside className={css.banner} role="status" data-print="hide">
      <span className={css.icon}>
        <Icon name="arrowUp" size={20} />
      </span>
      <b className={css.text}>{t('app.update.available')}</b>
      <Button variant="primary" size="m" onClick={() => window.location.reload()}>
        {t('app.update.reload')}
      </Button>
      <IconButton icon="x" tone="sunken" label={t('app.update.dismiss')} onClick={() => setHidden(true)} />
    </aside>
  );
}
