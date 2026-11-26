import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '../Icon';
import css from './Button.module.css';

export type ButtonVariant = 'primary' | 'sky' | 'outline' | 'glass' | 'danger';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'l' | 'm' | 's';
  block?: boolean;
  icon?: IconName;
  children?: ReactNode;
}

/** Капсула. L — головна дія внизу екрана; основна має градієнт і відблиск (Figma «v2/Кнопка») */
export function Button({ variant = 'outline', size = 'm', block, icon, className, children, type = 'button', ...rest }: Props) {
  const cls = [css.btn, css[variant], css[size], block && css.block, className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} {...rest}>
      {icon && <Icon name={icon} size={size === 's' ? 16 : 18} />}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  badge?: number;
  tone?: 'glass' | 'sunken' | 'plain';
}

/** Кругла кнопка-іконка; підпис обов'язковий для екранних читачів */
export function IconButton({ icon, label, badge, tone = 'plain', className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} data-tip={label} className={[css.iconBtn, css[`icon_${tone}`], className].filter(Boolean).join(' ')} {...rest}>
      <Icon name={icon} size={20} />
      {!!badge && <span className={css.badge}>{badge > 99 ? '99+' : badge}</span>}
    </button>
  );
}
