import { t } from '../../lib/texts';
import { Button } from '../Button';
import { Icon, type IconName } from '../Icon';
import css from './States.module.css';

export function Empty({ icon = 'inbox', title, hint }: { icon?: IconName; title: string; hint?: string }) {
  return (
    <div className={css.state}>
      <span className={css.icon}>
        <Icon name={icon} size={56} stroke={1.5} />
      </span>
      <b>{title}</b>
      {hint && <span>{hint}</span>}
    </div>
  );
}

export function Loading() {
  return (
    <div className={css.state} role="status">
      <span className={css.spinner} />
      <span>{t('app.common.loading')}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className={css.state} role="alert">
      <b>{message}</b>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          {t('app.common.retry')}
        </Button>
      )}
    </div>
  );
}
