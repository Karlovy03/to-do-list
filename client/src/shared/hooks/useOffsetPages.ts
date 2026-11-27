import { keepPreviousData, useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import type { Page } from '../api/types';

interface Options<P extends Page<unknown>> {
  queryKey: QueryKey;
  fetchPage: (offset: number) => Promise<P>;
  /** з якого зсуву починати (напр. журнал: першу сторінку вже віддала картка) */
  startAt?: number;
  enabled?: boolean;
  refetchInterval?: number;
  /** поки вантажиться новий запит (пошук під час набору) — показувати попередній список, а не «Завантаження» */
  keepPrevious?: boolean;
}

/** Список сторінками по offset: сервер повертає { items, hasMore }, «Показати ще» довантажує наступну */
export function useOffsetPages<P extends Page<unknown>>({ queryKey, fetchPage, startAt = 0, enabled, refetchInterval, keepPrevious }: Options<P>) {
  const q = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: startAt,
    getNextPageParam: (last, pages) => (last.hasMore ? startAt + pages.reduce((n, p) => n + p.items.length, 0) : undefined),
    enabled,
    refetchInterval,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
  });
  const items = (q.data?.pages.flatMap((p) => p.items) ?? []) as P['items'];
  return {
    ...q,
    items,
    first: q.data?.pages[0],
    hasMore: !!q.hasNextPage,
    loadMore: () => void q.fetchNextPage(),
    loadingMore: q.isFetchingNextPage,
  };
}
