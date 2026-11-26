import type { ReactNode } from 'react';
import { Empty } from '../States';
import type { IconName } from '../Icon';
import css from './ListDetail.module.css';

interface Props {
  /** Fold, планшет, комп'ютер — поруч; телефон — вибране замість списку */
  wide: boolean;
  list: ReactNode;
  /** вибраний запис (з адреси); null — нічого не вибрано */
  detail: ReactNode | null;
  /** що показати в правій колонці, поки нічого не вибрано */
  placeholder: { icon: IconName; title: string };
}

/** Список і картка вибраного: кожна колонка гортається окремо; вибране живе в адресі, тож переживає складання Fold */
export function ListDetail({ wide, list, detail, placeholder }: Props) {
  if (!wide) return <div className={css.page}>{detail ?? <div className={css.listCol}>{list}</div>}</div>;
  return (
    <div className={`${css.page} ${css.split}`}>
      <div className={css.listCol}>{list}</div>
      <div className={css.detailCol}>
        {detail ?? (
          <div className={css.emptyPane}>
            <Empty icon={placeholder.icon} title={placeholder.title} />
          </div>
        )}
      </div>
    </div>
  );
}
