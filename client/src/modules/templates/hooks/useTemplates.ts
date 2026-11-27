import { useOffsetPages } from '@/shared/hooks/useOffsetPages';
import { useRefetchInterval } from '@/shared/live/LiveContext';
import { templateKeys, templatesApi, type TemplateExt } from '../api/templates.api';

/** Бібліотека змінюється рідко, а нове приходить живим сигналом (ADR-0021) */
const BASE_INTERVAL = 5 * 60_000;

export function useTemplateList(q: string, type: TemplateExt | '') {
  const list = useOffsetPages({
    queryKey: templateKeys.list(q, type),
    fetchPage: (offset) => templatesApi.list(q, type, offset),
    refetchInterval: useRefetchInterval(BASE_INTERVAL),
    keepPrevious: true,
  });
  return { ...list, total: list.first?.total ?? 0 };
}
