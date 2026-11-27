import { useState } from 'react';
import { recall, remember } from '@/shared/lib/deviceMemory';

const NAME = 'calendar_collapsed';

function read(userId: string): ReadonlySet<string> {
  try {
    const v: unknown = JSON.parse(recall(userId, NAME) ?? '[]');
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

/** Згорнуті підрозділи «Дня» — пам'ятаються на пристрої для цієї людини (ADR-0022) */
export function useCollapsed(userId: string) {
  const [collapsed, setCollapsed] = useState(() => read(userId));
  const toggle = (key: string) =>
    setCollapsed((s) => {
      const next = new Set(s);
      if (!next.delete(key)) next.add(key);
      remember(userId, NAME, next.size ? JSON.stringify([...next]) : null);
      return next;
    });
  return { collapsed, toggle };
}
