import { t } from '../../lib/texts';
import { Icon } from '../Icon';
import css from './ControlSeal.module.css';

/** «Печатка контролю» — єдиний сміливий елемент; лише на завданнях на контролі */
export function ControlSeal({ controller }: { controller?: string | null }) {
  return (
    <span className={controller ? css.seal : `${css.seal} ${css.short}`}>
      <Icon name="shieldCheck" size={controller ? 16 : 14} />
      <span>{t('shared.ui.on_control')}</span>
      {controller && (
        <>
          <span className={css.sep} aria-hidden="true" />
          <span className={css.name}>{controller}</span>
        </>
      )}
    </span>
  );
}
