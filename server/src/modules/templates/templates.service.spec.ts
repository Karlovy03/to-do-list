import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../../core/http-error';
import type { Viewer } from '../access';

const repo = vi.hoisted(() => ({
  findById: vi.fn(), contentOf: vi.fn(), findBySha: vi.fn(), totalSize: vi.fn(), count: vi.fn(), list: vi.fn(), byIds: vi.fn(), search: vi.fn(),
  create: vi.fn(), update: vi.fn(), remove: vi.fn(), existingKeys: vi.fn(),
}));
const storage = vi.hoisted(() => ({ commit: vi.fn(), remove: vi.fn(), discard: vi.fn(), pathOf: vi.fn(), exists: vi.fn(), tempDir: vi.fn(), ensure: vi.fn() }));
const check = vi.hoisted(() => ({ checkFile: vi.fn() }));
const live = vi.hoisted(() => ({ announce: vi.fn() }));
vi.mock('./templates.repository', () => ({ templatesRepository: repo, TEMPLATE_PAGE: 30 }));
vi.mock('./templates.storage', () => ({ templatesStorage: storage }));
vi.mock('./check', () => check);
vi.mock('../live', () => live);

const { templatesService: svc, downloadName, nameFromFile } = await import('./templates.service');

const viewer = (id: string, role: Viewer['role'] = 'MEMBER', scope: Viewer['scope'] = new Set(), unitId: string | null = 'analytics') => ({ id, role, scope, unitId, isActive: true }) as Viewer;
const bondar = viewer('bondar');
const savchuk = viewer('savchuk');
const upload = (originalname = 'Рапорт_відпустка.docx', size = 48_000) => ({ path: '/files/tmp/abc', originalname, size });
const row = (over: Record<string, unknown> = {}) => ({ id: 't1', name: 'Рапорт', description: null, ext: 'docx', size: 1000, storageKey: 'a'.repeat(32), uploadedById: 'bondar', unitId: 'analytics', ...over });

beforeEach(() => {
  vi.clearAllMocks();
  check.checkFile.mockResolvedValue({ sha256: 'f'.repeat(64), textStatus: 'OK', content: 'Прошу надати щорічну відпустку' });
  repo.findBySha.mockResolvedValue(null);
  repo.totalSize.mockResolvedValue(0);
  repo.findById.mockResolvedValue(row());
  repo.create.mockImplementation(async (d: object) => ({ id: 'new', ...d }));
  repo.update.mockImplementation(async (id: string, d: object) => ({ id, ...d }));
  storage.commit.mockResolvedValue('b'.repeat(32));
});

describe('додавання', () => {
  it('перевірка → запис; назва з імені файлу; текст іде в пошуковий рядок; підрозділ того, хто додав; сигнал усім', async () => {
    await svc.create(bondar, upload(), {});
    expect(check.checkFile).toHaveBeenCalledWith('/files/tmp/abc', 'docx');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Рапорт_відпустка', ext: 'docx', size: 48_000, storageKey: 'b'.repeat(32), unitId: 'analytics', uploadedById: 'bondar',
      searchText: 'рапорт_відпустка\n\nпрошу надати щорічну відпустку',
    }));
    expect(live.announce).toHaveBeenCalledWith({ t: 'template', id: 'new' }, expect.any(Function));
  });
  it('старий .doc — відмова ще до перевірки, файл не переноситься', async () => {
    await expect(svc.create(bondar, upload('старий.doc'), {})).rejects.toMatchObject({ status: 400, code: 'template_old_format' });
    expect(check.checkFile).not.toHaveBeenCalled();
    expect(storage.commit).not.toHaveBeenCalled();
  });
  it('перевірка не дала вердикту (тайм-аут, падіння) — відмова, нічого не записано', async () => {
    check.checkFile.mockRejectedValue(new HttpError(400, 'template_check_failed'));
    await expect(svc.create(bondar, upload(), {})).rejects.toMatchObject({ code: 'template_check_failed' });
    expect(storage.commit).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });
  it('такий самий файл уже є — 409 з назвою наявного', async () => {
    repo.findBySha.mockResolvedValue({ id: 'old', name: 'Рапорт про відпустку' });
    await expect(svc.create(bondar, upload(), {})).rejects.toMatchObject({ status: 409, code: 'template_duplicate', details: { name: 'Рапорт про відпустку' } });
    expect(storage.commit).not.toHaveBeenCalled();
  });
  it('місце закінчилось — 413', async () => {
    repo.totalSize.mockResolvedValue(5000 * 1024 * 1024 - 1000);
    await expect(svc.create(bondar, upload(), {})).rejects.toMatchObject({ status: 413, code: 'storage_full' });
  });
  it('запис у базу не вдався — перенесений файл прибирається', async () => {
    repo.create.mockRejectedValue(new Error('db down'));
    await expect(svc.create(bondar, upload(), {})).rejects.toThrow('db down');
    expect(storage.remove).toHaveBeenCalledWith('b'.repeat(32));
  });
});

describe('заміна файлу', () => {
  it('новий ключ записано, старий файл видалено після запису; пошуковий рядок — зі старою назвою й новим текстом', async () => {
    await svc.replace(bondar, 't1', upload('новий.docx', 2000));
    expect(repo.update).toHaveBeenCalledWith('t1', expect.objectContaining({ storageKey: 'b'.repeat(32), size: 2000, searchText: 'рапорт\n\nпрошу надати щорічну відпустку' }));
    expect(storage.remove).toHaveBeenCalledWith('a'.repeat(32));
    expect(repo.update.mock.invocationCallOrder[0]).toBeLessThan(storage.remove.mock.invocationCallOrder[0]);
  });
  it('чужий шаблон виконавець не замінює — 403, файл навіть не перевіряється', async () => {
    await expect(svc.replace(savchuk, 't1', upload())).rejects.toMatchObject({ status: 403, code: 'template_change_not_allowed' });
    expect(check.checkFile).not.toHaveBeenCalled();
  });
});

describe('зміна й видалення', () => {
  it('назва й опис: пошуковий рядок перераховується з наявним текстом', async () => {
    repo.contentOf.mockResolvedValue('Текст');
    await svc.update(bondar, 't1', { name: 'Нова назва', description: 'Опис' });
    expect(repo.update).toHaveBeenCalledWith('t1', { name: 'Нова назва', description: 'Опис', searchText: 'нова назва\nопис\nтекст' });
  });
  it('виконавець не видаляє чужий; автор — так, і файл зникає з диска', async () => {
    await expect(svc.remove(savchuk, 't1')).rejects.toMatchObject({ status: 403 });
    expect(repo.remove).not.toHaveBeenCalled();
    await svc.remove(bondar, 't1');
    expect(repo.remove).toHaveBeenCalledWith('t1');
    expect(storage.remove).toHaveBeenCalledWith('a'.repeat(32));
  });
  it('немає шаблону — 404', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.remove(bondar, 'x')).rejects.toMatchObject({ status: 404 });
  });
});

describe('імена', () => {
  it('назва за замовчуванням — ім’я файлу без розширення; скачування — назва + розширення без заборонених символів', () => {
    expect(nameFromFile('  Графік   чергувань.xlsx')).toBe('Графік чергувань');
    expect(downloadName({ name: 'Наказ №5 / 2026: "зразок"', ext: 'pdf' })).toBe('Наказ №5 _ 2026_ _зразок_.pdf');
  });
});
