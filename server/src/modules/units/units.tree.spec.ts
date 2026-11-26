import { describe, expect, it } from 'vitest';
import { subtreeIds, unitPath, wouldCycle, type UnitNode } from './units.tree';

const units: UnitNode[] = [
  { id: 'dept', name: 'Управління', parentId: null },
  { id: 'a', name: 'Відділ аналітики', parentId: 'dept' },
  { id: 'a1', name: 'Сектор звернень', parentId: 'a' },
  { id: 'b', name: 'Відділ контролю', parentId: 'dept' },
];

describe('дерево підрозділів', () => {
  it('піддерево включає сам підрозділ і всі нижчі', () => {
    expect([...subtreeIds('a', units)].sort()).toEqual(['a', 'a1']);
    expect(subtreeIds('dept', units).size).toBe(4);
  });
  it('піддерево не включає сусідні й вищі підрозділи', () => {
    const s = subtreeIds('a', units);
    expect(s.has('b')).toBe(false);
    expect(s.has('dept')).toBe(false);
  });
  it('шлях від кореня', () => {
    expect(unitPath('a1', units)).toBe('Управління › Відділ аналітики › Сектор звернень');
  });
  it('не можна перемістити підрозділ у себе чи в свого нащадка', () => {
    expect(wouldCycle('a', 'a', units)).toBe(true);
    expect(wouldCycle('a', 'a1', units)).toBe(true);
    expect(wouldCycle('a1', 'b', units)).toBe(false);
  });
});
