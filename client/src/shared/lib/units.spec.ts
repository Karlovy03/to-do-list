import { describe, expect, it } from 'vitest';
import { flattenTree, subtree, unitPath } from './units';

const units = [
  { id: 'b', name: 'Відділ контролю', parentId: 'dept' },
  { id: 'dept', name: 'Управління', parentId: null },
  { id: 'a1', name: 'Сектор звернень', parentId: 'a' },
  { id: 'a', name: 'Відділ аналітики', parentId: 'dept' },
];

describe('структура на клієнті', () => {
  it('порядок показу: батьківський, під ним дочірні за абеткою', () => {
    expect(flattenTree(units).map((u) => `${u.depth}:${u.id}`)).toEqual(['0:dept', '1:a', '2:a1', '1:b']);
  });
  it('шлях підрозділу', () => {
    expect(unitPath('a1', units)).toBe('Управління › Відділ аналітики › Сектор звернень');
    expect(unitPath(null, units)).toBe('');
  });
  it('піддерево — для заборони перенесення в нащадка', () => {
    expect([...subtree('a', units)].sort()).toEqual(['a', 'a1']);
  });
});
