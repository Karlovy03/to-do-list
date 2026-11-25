import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '../Icon';
import css from './Button.module.css';

type Variant = 'primary' | 'soft' | 'ghost' | 'danger' | 'gold';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'md' | 'sm';
  block?: boolean;
  icon?: IconName;
  children?: ReactNode;
}

export function Button({ variant = 'soft', size = 'md', block, icon, className, children, type = 'button', ...rest }: Props) {
  const cls = [css.btn, css[variant], size === 'sm' && css.sm, block && css.block, className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  badge?: number;
  tone?: 'default' | 'onBrand';
}

/** Кнопка-іконка: підпис обов'язковий (для екранних читачів) */
export function IconButton({ icon, label, badge, tone = 'default', className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} title={label} className={[css.iconBtn, tone === 'onBrand' && css.onBrand, className].filter(Boolean).join(' ')} {...rest}>
      <Icon name={icon} />
      {!!badge && <span className={css.badge}>{badge > 99 ? '99+' : badge}</span>}
    </button>
  );
}
