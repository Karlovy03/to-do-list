import type { CSSProperties, ReactNode } from 'react';
import type { RowContent } from '../../lib/rows';
import { EventBlock } from '../EventBlock/EventBlock';
import { TaskBar } from '../TaskBar/TaskBar';
import css from './CalendarRow.module.css';

export type ItemLink = (kind: 't' | 'e', id: string) => string;

interface Props {
  label: ReactNode;
  content: RowContent;
  /** лінія «зараз», % ширини доріжки */
  nowPos: number | null;
  tone?: 'today' | 'weekend';
  linkTo: ItemLink;
}

const lanes = (n: number) => ({ '--lanes': n }) as CSSProperties;

/** Рядок сітки: ліворуч хто чи який день, праворуч доріжки — угорі завдання, під ними заходи */
export function CalendarRow({ label, content, nowPos, tone, linkTo }: Props) {
  return (
    <div className={tone ? `${css.row} ${css[tone]}` : css.row}>
      <div className={css.who}>{label}</div>
      <div className={css.track}>
        {content.taskLanes > 0 && (
          <div className={css.lanes} style={lanes(content.taskLanes)}>
            {content.tasks.map((x) => <TaskBar key={x.task.id} item={x} to={linkTo('t', x.task.id)} />)}
          </div>
        )}
        {content.eventLanes > 0 && (
          <div className={css.lanes} style={lanes(content.eventLanes)}>
            {content.events.map((x) => <EventBlock key={x.event.id} item={x} to={linkTo('e', x.event.id)} />)}
          </div>
        )}
        {nowPos !== null && <span className={css.now} style={{ left: `${nowPos}%` }} aria-hidden="true" />}
      </div>
    </div>
  );
}
