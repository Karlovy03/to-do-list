import { describe, expect, it } from 'vitest';
import type { Template } from '../api/templates.api';
import { fileProblem, metaLine, nameFromFile, shortDay, sizeText } from './format';

const NB = ' ';
const tpl = (over: Partial<Template> = {}): Template => ({
  id: 't1', name: 'Рапорт', description: null, ext: 'docx', size: 48 * 1024, textStatus: 'OK', createdAt: '2026-11-27T09:00:00Z',
  unit: { id: 'u', name: 'Відділ аналітики' },
  uploadedBy: { id: 'b', fullName: 'Бондар Андрій', position: '', role: 'MEMBER', unitId: 'u', isActive: true },
  can: { change: false }, match: null, ...over,
});

describe('рядок «Мета» (Figma 42, правка власника)', () => {
  it('нерозривний пробіл перед «·» і між числом та одиницею — переноситься цілими шматками', () => {
    expect(metaLine(tpl(), new Date('2026-11-28T10:00:00Z'))).toBe(`Відділ аналітики${NB}· Бондар А.${NB}· 27.11${NB}· 48${NB}КБ`);
  });
  it('без підрозділу й автора — лише дата й розмір; торішній — з роком', () => {
    expect(metaLine(tpl({ unit: null, uploadedBy: null, createdAt: '2025-03-04T09:00:00Z' }), new Date('2026-11-28T10:00:00Z'))).toBe(`04.03.2025${NB}· 48${NB}КБ`);
  });
  it('розмір: байти, КБ, МБ з комою', () => {
    expect(sizeText(900)).toBe(`900${NB}Б`);
    expect(sizeText(31 * 1024)).toBe(`31${NB}КБ`);
    expect(sizeText(1.2 * 1024 * 1024)).toBe(`1,2${NB}МБ`);
    expect(sizeText(20 * 1024 * 1024)).toBe(`20${NB}МБ`);
  });
  it('дата за Києвом: 23:30 UTC 30.11 — це вже 1 грудня', () => {
    expect(shortDay('2026-11-30T23:30:00Z', new Date('2026-12-02T00:00:00Z'))).toBe('01.12');
  });
});

describe('файл до надсилання', () => {
  it('назва з імені файлу: без розширення, «_» як пробіл', () => {
    expect(nameFromFile('Рапорт_на__відпустку.docx')).toBe('Рапорт на відпустку');
  });
  it('ті самі коди, що й у сервера: старий формат, макроси за розширенням, інший формат, завеликий', () => {
    expect(fileProblem({ name: 'a.docx', size: 1 })).toBeNull();
    expect(fileProblem({ name: 'a.PDF', size: 20 * 1024 * 1024 })).toBeNull();
    expect(fileProblem({ name: 'a.doc', size: 1 })).toBe('template_old_format');
    expect(fileProblem({ name: 'a.xlsm', size: 1 })).toBe('template_macros');
    expect(fileProblem({ name: 'a.jpg', size: 1 })).toBe('template_bad_format');
    expect(fileProblem({ name: 'a.pdf', size: 20 * 1024 * 1024 + 1 })).toBe('template_too_large');
  });
});
