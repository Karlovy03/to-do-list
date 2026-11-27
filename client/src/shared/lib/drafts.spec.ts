import { beforeEach, describe, expect, it } from 'vitest';
import { DRAFT_MAX_AGE, readDraft, writeDraft } from './drafts';

const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k), key: () => null, length: 0 },
  configurable: true,
});
beforeEach(() => store.clear());

const parse = (raw: unknown) => (typeof raw === 'object' && raw !== null && typeof (raw as { title?: unknown }).title === 'string' ? (raw as { title: string }) : null);
const NOW = new Date('2026-11-27T08:12:00Z');

describe('чернетка форми', () => {
  it('записане читається з часом збереження; іншій людині не видно', () => {
    writeDraft('u1', 'draft_task', { title: 'Довідка' }, NOW);
    expect(readDraft('u1', 'draft_task', parse, NOW)).toEqual({ data: { title: 'Довідка' }, savedAt: NOW.toISOString() });
    expect(readDraft('u2', 'draft_task', parse, NOW)).toBeNull();
  });
  it('null стирає', () => {
    writeDraft('u1', 'draft_task', { title: 'Довідка' }, NOW);
    writeDraft('u1', 'draft_task', null, NOW);
    expect(readDraft('u1', 'draft_task', parse, NOW)).toBeNull();
  });
  it('стара (понад тиждень) і зіпсована — ніби немає', () => {
    writeDraft('u1', 'draft_task', { title: 'Довідка' }, NOW);
    expect(readDraft('u1', 'draft_task', parse, new Date(NOW.getTime() + DRAFT_MAX_AGE))).toBeNull();
    store.set('kt_mem_u1_draft_task', '{не json');
    expect(readDraft('u1', 'draft_task', parse, NOW)).toBeNull();
    writeDraft('u1', 'draft_task', { title: 7 }, NOW);
    expect(readDraft('u1', 'draft_task', parse, NOW)).toBeNull();
  });
});
