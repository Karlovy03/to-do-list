import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '@/modules/auth';
import { EventDetail } from '@/modules/events';
import { TaskDetail } from '@/modules/tasks';
import { errorText } from '@/shared/api/errors';
import { usePeople, useUnits } from '@/shared/api/people';
import type { Me } from '@/shared/api/types';
import { useElementWidth } from '@/shared/hooks/useElementWidth';
import { useNow } from '@/shared/hooks/useNow';
import { useWindowClass } from '@/shared/hooks/useWindowClass';
import { t } from '@/shared/lib/texts';
import { formatLongDate } from '@/shared/lib/time';
import { ErrorState, Loading, PageHeader, Sheet } from '@/shared/ui';
import { CalendarToolbar } from '../../components/CalendarToolbar/CalendarToolbar';
import { FilterSheet } from '../../components/FilterSheet/FilterSheet';
import { Legend } from '../../components/Legend/Legend';
import { TimeGrid } from '../../components/TimeGrid/TimeGrid';
import { useCalendar } from '../../hooks/useCalendar';
import { gridHours, gridModel } from '../../lib/grid';
import { addDays, periodTitle, todayKey } from '../../lib/range';
import { defaultStart, shiftStart, visibleSpan } from '../../lib/view';
import css from './CalendarPage.module.css';

export function CalendarPage() {
  const { me } = useSession();
  return me ? <Calendar me={me} /> : null;
}

/**
 * Календар (ADR-0017). Режим, день і «кого» — в адресі; вибране завдання чи захід — /calendar/t|e/:id:
 * на телефоні окремий екран, ширше — аркуш поверх сітки, і після закриття сітка та сама.
 */
function Calendar({ me }: { me: Me }) {
  const { taskId, eventId } = useParams();
  const navigate = useNavigate();
  const wc = useWindowClass();
  const phone = wc === 'xs' || wc === 'sm';
  const now = useNow();
  const units = useUnits();
  const people = usePeople();
  const { params, set, search, data } = useCalendar(me);
  const [choosing, setChoosing] = useState(false);

  // видиме вікно годин: скільки влазить у ширину; зсув кнопками чи свайпом — до зміни періоду, фільтра чи ширини
  const [measure, width] = useElementWidth<HTMLDivElement>();
  const nameW = phone ? 104 : wc === 'md' ? 184 : 232;
  const trackW = Math.max(0, width - nameW);
  const hours = data.data ? gridHours(params, data.data, now) : null;
  const range = hours?.range ?? ([8, 19] as [number, number]);
  const span = visibleSpan(trackW, phone, range);
  const viewKey = `${search}|${span}|${range.join('-')}`;
  const [moved, setMoved] = useState<{ key: string; start: number } | null>(null);
  const start = moved?.key === viewKey ? moved.start : defaultStart(span, range, hours?.nowHour ?? null);
  // params щоразу новий об'єкт, але виводиться з search — тож залежність саме від search
  const model = useMemo(
    () => (data.data && width ? gridModel(params, data.data, units.data ?? [], now, [start, start + span]) : null),
    [data.data, units.data, now, search, start, span, width],
  );

  const query = search ? `?${search}` : '';
  const back = `/calendar${query}`;
  const detail = taskId ? <TaskDetail key={taskId} id={taskId} back={back} /> : eventId ? <EventDetail key={eventId} id={eventId} back={back} /> : null;
  if (phone && detail) return <div className={css.page}>{detail}</div>;

  const today = todayKey(now);
  const f = params.filter;
  const whoLabel = f.kind === 'unit' ? units.data?.find((u) => u.id === f.unitId)?.name
    : f.kind === 'person' ? people.data?.find((p) => p.id === f.personId)?.fullName
    : t('calendar.filters.me');

  return (
    <div className={css.page}>
      <PageHeader eyebrow={formatLongDate(now)} title={t('calendar.toolbar.title')} />
      <CalendarToolbar
        mode={params.mode}
        title={periodTitle(params.mode, params.day, now)}
        who={me.role === 'MEMBER' ? undefined : { label: whoLabel ?? '', icon: f.kind === 'unit' ? 'users' : 'user', onOpen: () => setChoosing(true) }}
        onMode={(mode) => set({ mode })}
        onShift={(dir) => set({ day: addDays(params.day, dir * (params.mode === 'week' ? 7 : 1)) })}
        onToday={() => set({ day: today })}
      />
      <div ref={measure}>
        {model ? (
          <TimeGrid
            model={model}
            now={now}
            phone={phone}
            nameW={nameW}
            trackW={trackW}
            can={{ earlier: start > range[0], later: start + span < range[1] }}
            onShift={(dir) => setMoved({ key: viewKey, start: shiftStart(start, dir, span, range) })}
            linkTo={(kind, id) => `/calendar/${kind}/${id}${query}`}
          />
        ) : data.error ? (
          <ErrorState message={errorText(data.error)} onRetry={() => void data.refetch()} />
        ) : (
          <Loading />
        )}
      </div>
      <Legend wide={!phone} />

      {choosing && (
        <FilterSheet me={me} mode={params.mode} value={params.filter} onClose={() => setChoosing(false)}
          onApply={(filter) => { setChoosing(false); set({ filter }); }} />
      )}
      {detail && (
        <Sheet solid title={t(taskId ? 'calendar.detail.task' : 'calendar.detail.event')} onClose={() => navigate(back)}>
          {detail}
        </Sheet>
      )}
    </div>
  );
}
