import { useRef, type CSSProperties, type TouchEvent } from 'react';
import { t } from '@/shared/lib/texts';
import { formatTime } from '@/shared/lib/time';
import { Avatar, Icon } from '@/shared/ui';
import { useCollapsed } from '../../hooks/useCollapsed';
import type { GridModel } from '../../lib/grid';
import { dayLabel } from '../../lib/range';
import { CalendarRow, type ItemLink } from '../CalendarRow/CalendarRow';
import css from './TimeGrid.module.css';

interface Props {
  model: GridModel;
  now: Date;
  phone: boolean;
  /** ширина колонки «хто / день» і доріжки, px — для ліній годин і підписів */
  nameW: number;
  trackW: number;
  /** куди ще можна зсунути вікно годин */
  can: { earlier: boolean; later: boolean };
  onShift: (dir: 1 | -1) => void;
  linkTo: ItemLink;
  /** чиї згорнуті підрозділи пам'ятати */
  userId: string;
}

const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;
/** Ширина підпису «08:00» з відступом; підпис ховається, якщо не влазить біля правого краю чи його закриває «зараз» */
const LABEL_PX = 36;

/** Сітка часу: колонка «хто / день», шкала годин, рядки з доріжками (Figma 15, 16, 18, 19). Вбік не гортається */
export function TimeGrid({ model, now, phone, nameW, trackW, can, onShift, linkTo, userId }: Props) {
  const { collapsed, toggle } = useCollapsed(userId);
  const touch = useRef<{ x: number; y: number } | null>(null);
  // свайп уліво-вправо зсуває вікно годин; вертикальний — гортає сторінку як звичайно
  const onTouchStart = (e: TouchEvent) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY });
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) {
      if (dx < 0 && can.later) onShift(1);
      if (dx > 0 && can.earlier) onShift(-1);
    }
  };

  const [from, to] = model.view;
  const hourPx = trackW / (to - from);
  const px = (pos: number) => (pos / 100) * trackW;
  const labels = model.ticks.filter((x) => px(x.pos) + LABEL_PX <= trackW && (model.nowPos === null || Math.abs(px(x.pos) + LABEL_PX / 2 - px(model.nowPos)) > LABEL_PX + 4));
  const rows = model.rows.filter((r) => r.kind !== 'person' || !collapsed.has(r.group));
  const corner = model.rows.some((r) => r.kind === 'day') ? t('calendar.grid.day') : t('calendar.grid.who');
  const style = {
    '--name-w': `${nameW}px`,
    '--hour-px': `${hourPx}px`,
    '--hour-offset': `${(Math.ceil(from) - from) * hourPx}px`,
  } as CSSProperties;

  return (
    <div className={css.frame} style={style} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className={css.scale}>
        <div className={css.corner}>{corner}</div>
        <div className={css.ticks}>
          {can.earlier && (
            <button type="button" className={`${css.shift} ${css.earlier}`} onClick={() => onShift(-1)}>
              {t('calendar.grid.earlier')}
            </button>
          )}
          {can.later && (
            <button type="button" className={`${css.shift} ${css.later}`} onClick={() => onShift(1)}>
              {t('calendar.grid.later')}
            </button>
          )}
          {labels.map((x) => (
            <span key={x.hour} className={css.tick} style={{ left: `${x.pos}%` }}>{hourLabel(x.hour)}</span>
          ))}
          {model.nowPos !== null && <span className={css.nowPill} style={{ left: `${model.nowPos}%` }}>{formatTime(now)}</span>}
        </div>
      </div>
      {rows.length === 0 && <p className={css.empty}>{t('calendar.grid.nobody')}</p>}
      {rows.map((r) => {
        if (r.kind === 'group') {
          const open = !collapsed.has(r.key);
          return (
            <div key={r.key} className={css.group}>
              <button type="button" className={css.groupBtn} aria-expanded={open} onClick={() => toggle(r.key)}>
                <span className={open ? css.chevronOpen : css.chevron}><Icon name="chevron" size={16} /></span>
                <b>{r.title}</b>
                <span className={css.count}>{r.count}</span>
              </button>
            </div>
          );
        }
        if (r.kind === 'day') {
          return (
            <CalendarRow key={r.key} content={r.content} nowPos={r.nowPos} linkTo={linkTo} tone={r.today ? 'today' : r.weekend ? 'weekend' : undefined}
              label={<span className={r.today ? `${css.dayLabel} ${css.todayLabel}` : css.dayLabel}>{dayLabel(r.day)}</span>} />
          );
        }
        return (
          <CalendarRow key={r.key} content={r.content} nowPos={r.nowPos} linkTo={linkTo}
            label={
              <span className={css.person}>
                {!phone && <Avatar person={r.person} />}
                <span className={css.name}>
                  <b>{phone ? r.person.fullName.split(/\s+/)[0] : r.person.fullName}</b>
                  <small>{r.person.position}</small>
                </span>
              </span>
            } />
        );
      })}
    </div>
  );
}
