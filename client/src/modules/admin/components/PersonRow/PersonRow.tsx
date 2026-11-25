import type { ReactNode } from 'react';
import { Avatar, Icon } from '@/shared/ui';
import css from './PersonRow.module.css';

/** Рядок списку адмінки: аватар, ім'я, підпис, мітки; торкання відкриває редагування */
export function PersonRow({ name, note, tags, inactive, onClick }: { name: string; note: string; tags?: ReactNode; inactive?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={inactive ? `${css.row} ${css.inactive}` : css.row} onClick={onClick}>
      <Avatar person={{ fullName: name }} large />
      <span className={css.text}>
        <b>{name}</b>
        <small>{note}</small>
      </span>
      {tags && <span className={css.tags}>{tags}</span>}
      <Icon name="edit" size={18} />
    </button>
  );
}
