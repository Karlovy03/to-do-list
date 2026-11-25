import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '@/shared/ui';
import css from './RowButton.module.css';

interface Props {
  icon?: IconName;
  danger?: boolean;
  children: ReactNode;
  to?: string;
  onClick?: () => void;
}

/** Рядок-кнопка або рядок-посилання з шевроном */
export function RowButton({ icon, danger, children, to, onClick }: Props) {
  const cls = danger ? `${css.row} ${css.danger}` : css.row;
  const inner = (
    <>
      {icon && <Icon name={icon} size={20} />}
      <span className={css.label}>{children}</span>
      <Icon name="chevron" size={18} />
    </>
  );
  return to ? (
    <Link to={to} className={cls}>{inner}</Link>
  ) : (
    <button type="button" className={cls} onClick={onClick}>{inner}</button>
  );
}
