import { t } from '../../lib/texts';
import { Button } from '../Button';
import css from './LoadMore.module.css';

/** «Показати ще» під списком, що приходить сторінками */
export function LoadMore({ onClick, busy }: { onClick: () => void; busy?: boolean }) {
  return (
    <div className={css.root} data-print="hide">
      <Button variant="outline" size="m" disabled={busy} onClick={onClick}>
        {busy ? t('shared.ui.loading') : t('shared.ui.load_more')}
      </Button>
    </div>
  );
}
