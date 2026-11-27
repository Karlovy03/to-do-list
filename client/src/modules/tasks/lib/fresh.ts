import { useSyncExternalStore } from 'react';

/** Скільки картка щойно дорученого завдання підсвічена в списку (Figma 39, 40) */
export const FRESH_MS = 3_000;

const fresh = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Підсвітити картку завдання на кілька секунд — нове прийшло, поки застосунок відкритий */
export function markFresh(id: string) {
  fresh.add(id);
  emit();
  setTimeout(() => {
    fresh.delete(id);
    emit();
  }, FRESH_MS);
}

export const isFresh = (id: string) => fresh.has(id);

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useFresh = (id: string) => useSyncExternalStore(subscribe, () => fresh.has(id));
