import { useParams } from 'react-router-dom';
import { errorText } from '@/shared/api/errors';
import { useNow } from '@/shared/hooks/useNow';
import { useWindowClass } from '@/shared/hooks/useWindowClass';
import { t } from '@/shared/lib/texts';
import { formatLongDate } from '@/shared/lib/time';
import { Empty, ErrorState, ListDetail, LoadMore, Loading, PageHeader } from '@/shared/ui';
import { EventDetail } from '../../components/EventDetail/EventDetail';
import { EventList } from '../../components/EventList/EventList';
import { useEventList } from '../../hooks/useEvents';

const BASE = '/events';

/**
 * Заходи: найближчі й минулі одним списком за групами. Вибраний захід — в адресі (/events/e/:eventId):
 * на телефоні окремий екран, ширше — поруч зі списком.
 */
export function EventsPage() {
  const { eventId } = useParams();
  const wc = useWindowClass();
  const wide = wc === 'md' || wc === 'lg';
  const now = useNow();
  const upcoming = useEventList('upcoming');
  const past = useEventList('past');

  const events = [...upcoming.items, ...past.items];
  const loadMore = () => {
    if (upcoming.hasMore) upcoming.loadMore();
    else if (past.hasMore) past.loadMore();
  };
  const list = upcoming.isLoading ? (
    <Loading />
  ) : upcoming.error ? (
    <ErrorState message={errorText(upcoming.error)} onRetry={() => void upcoming.refetch()} />
  ) : events.length === 0 ? (
    <Empty icon="event" title={t('events.list.empty')} hint={t('events.list.empty_hint')} />
  ) : (
    <>
      <EventList events={events} selectedId={eventId} compact={wc === 'xs'} now={now} />
      {(upcoming.hasMore || past.hasMore) && <LoadMore onClick={loadMore} busy={upcoming.loadingMore || past.loadingMore} />}
    </>
  );

  return (
    <ListDetail
      wide={wide}
      list={
        <>
          <PageHeader eyebrow={formatLongDate(now)} title={t('events.list.title')} />
          {list}
        </>
      }
      detail={eventId ? <EventDetail key={eventId} id={eventId} back={BASE} /> : null}
      placeholder={{ icon: 'event', title: t('events.detail.select_hint') }}
    />
  );
}
