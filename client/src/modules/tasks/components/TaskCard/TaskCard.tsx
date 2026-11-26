import { Link } from 'react-router-dom';
import type { Task } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { Avatars, ControlSeal, Icon, Tag, TimeChip } from '@/shared/ui';
import { timeChipFor } from '../../lib/timeTone';
import { shortName } from '@/shared/lib/names';
import { useSwipe } from './useSwipe';
import css from './TaskCard.module.css';

interface Props {
  task: Task;
  to: string;
  selected?: boolean;
  /** вузька колонка або обкладинка Flip: без виконавців і мітки пріоритету */
  compact?: boolean;
  onSwipeDone?: () => void;
}

/** Картка завдання в списку: суцільна біла, без розмиття (дешево для простих телефонів) */
export function TaskCard({ task, to, selected, compact, onSwipeDone }: Props) {
  const swipe = useSwipe(!!onSwipeDone && task.can.markDone, () => onSwipeDone?.());
  const chip = timeChipFor(task);
  const controller = task.control?.controller ? shortName(task.control.controller.name) : null;
  const tag = task.priority === 'URGENT' ? { tone: 'urgent' as const, text: t('tasks.priority.URGENT') } : task.overdue && !task.control ? { tone: 'late' as const, text: t('tasks.status.overdue') } : null;
  const closed = task.status === 'DONE' || task.status === 'CANCELLED';

  return (
    <div className={css.slot}>
      {swipe.dx > 0 && (
        <div className={css.under} aria-hidden="true">
          <Icon name="check" size={22} />
          {t('tasks.actions.done')}
        </div>
      )}
      <Link
        to={to}
        className={[css.card, selected && css.selected, closed && css.closed, compact && css.compact].filter(Boolean).join(' ')}
        style={swipe.dx ? { transform: `translateX(${swipe.dx}px)` } : undefined}
        aria-current={selected ? 'true' : undefined}
        {...swipe.handlers}
      >
        {(task.control || (tag && !compact)) && (
          <div className={css.top}>
            {task.control && <ControlSeal controller={compact ? null : controller} />}
            {tag && !compact && <Tag tone={tag.tone}>{tag.text}</Tag>}
          </div>
        )}
        <h3 className={css.title}>{task.title}</h3>
        <div className={css.bottom}>
          <TimeChip tone={chip.tone} time={chip.time} rest={chip.rest} />
          {!compact && <Avatars people={task.assignees} />}
        </div>
      </Link>
    </div>
  );
}
