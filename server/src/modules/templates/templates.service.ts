import { config } from '../../core/config';
import { badRequest, forbidden, HttpError, notFound } from '../../core/http-error';
import { isUniqueViolation } from '../../core/prisma';
import type { Viewer } from '../access';
import { announce } from '../live';
import { checkFile } from './check';
import { extOf, isExt } from './inspect';
import { canChangeTemplate } from './templates.policy';
import { TEMPLATE_PAGE, templatesRepository as repo, type SearchHit, type TemplateRow } from './templates.repository';
import type { ListTemplatesQuery, UpdateTemplateInput, UploadFields } from './templates.schemas';
import { foldCase, searchTextOf } from './templates.search';
import { templatesStorage as storage } from './templates.storage';

/** Шаблони бачать усі (рішення власника) — сигнал теж усім (ADR-0021) */
const announceTemplate = (id: string) => announce({ t: 'template', id }, () => true);

const MB = 1 << 20;
export const MAX_FILE_MB = 20;

/** Файл, який multer уже записав у тимчасову теку */
export interface Upload {
  path: string;
  originalname: string;
  size: number;
}

const duplicate = (name: string) => new HttpError(409, 'template_duplicate', { name });

/** Перевірка вмісту в дочірньому процесі й пошук такого самого файлу */
async function accept(file: Upload) {
  const e = extOf(file.originalname);
  if ('reason' in e) throw badRequest(e.reason);
  const checked = await checkFile(file.path, e.ext);
  const same = await repo.findBySha(checked.sha256);
  if (same) throw duplicate(same.name);
  return { ext: e.ext, ...checked };
}

async function ensureRoom(extraBytes: number) {
  if ((await repo.totalSize()) + extraBytes > config.FILES_MAX_TOTAL_MB * MB) throw new HttpError(413, 'storage_full');
}

async function loadChangeable(viewer: Viewer, id: string) {
  const t = await repo.findById(id);
  if (!t) throw notFound();
  if (!canChangeTemplate(t, viewer)) throw forbidden('template_change_not_allowed');
  return t;
}

/** Назва за замовчуванням — ім'я файлу без розширення */
export const nameFromFile = (fileName: string) => fileName.replace(/\.[^.]*$/, '').replace(/\s+/g, ' ').trim().slice(0, 200) || fileName.slice(0, 200);

/** Ім'я для скачування: назва шаблону + розширення, без символів, які забороняють файлові системи */
export const downloadName = (t: { name: string; ext: string }) => `${t.name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_')}.${t.ext}`;

export const templatesService = {
  async list(q: ListTemplatesQuery) {
    const total = await repo.count();
    if (!q.q) {
      const rows = await repo.list(q.type ?? null, q.offset);
      return { rows: rows.slice(0, TEMPLATE_PAGE).map((row) => ({ row, hit: undefined })), hasMore: rows.length > TEMPLATE_PAGE, total };
    }
    const hits = await repo.search(foldCase(q.q), q.type ?? null, q.offset);
    const page = hits.slice(0, TEMPLATE_PAGE);
    const byId = new Map((await repo.byIds(page.map((h) => h.id))).map((t) => [t.id, t]));
    const rows: { row: TemplateRow; hit?: SearchHit }[] = [];
    for (const hit of page) {
      const row = byId.get(hit.id);
      if (row) rows.push({ row, hit });
    }
    return { rows, hasMore: hits.length > TEMPLATE_PAGE, total };
  },

  /** Тимчасовий файл прибирає receiveFile; тут він або переноситься в сховище, або лишається на прибирання */
  async create(viewer: Viewer, file: Upload, fields: UploadFields) {
    const a = await accept(file);
    await ensureRoom(file.size);
    const name = fields.name ?? nameFromFile(file.originalname);
    const description = fields.description ?? null;
    const key = await storage.commit(file.path);
    try {
      const created = await repo.create({
        name, description, ext: a.ext, size: file.size, sha256: a.sha256, storageKey: key,
        content: a.content, textStatus: a.textStatus, searchText: searchTextOf(name, description, a.content),
        unitId: viewer.unitId, uploadedById: viewer.id,
      });
      announceTemplate(created.id);
      return created;
    } catch (err) {
      await storage.remove(key);
      // двоє одночасно додали той самий файл
      if (isUniqueViolation(err)) throw duplicate(name);
      throw err;
    }
  },

  async update(viewer: Viewer, id: string, input: UpdateTemplateInput) {
    const t = await loadChangeable(viewer, id);
    const name = input.name ?? t.name;
    const description = input.description === undefined ? t.description : input.description;
    const updated = await repo.update(id, { name, description, searchText: searchTextOf(name, description, await repo.contentOf(id)) });
    announceTemplate(id);
    return updated;
  },

  /** Новий файл — новий ключ; старий видаляється лише після запису в базі */
  async replace(viewer: Viewer, id: string, file: Upload) {
    const t = await loadChangeable(viewer, id);
    const a = await accept(file);
    await ensureRoom(file.size - t.size);
    const key = await storage.commit(file.path);
    let updated: TemplateRow;
    try {
      updated = await repo.update(id, {
        ext: a.ext, size: file.size, sha256: a.sha256, storageKey: key, content: a.content, textStatus: a.textStatus,
        searchText: searchTextOf(t.name, t.description, a.content),
      });
    } catch (err) {
      await storage.remove(key);
      if (isUniqueViolation(err)) throw duplicate(t.name);
      throw err;
    }
    await storage.remove(t.storageKey);
    announceTemplate(id);
    return updated;
  },

  async remove(viewer: Viewer, id: string) {
    const t = await loadChangeable(viewer, id);
    await repo.remove(id);
    await storage.remove(t.storageKey);
    announceTemplate(id);
  },

  /** Що віддати на скачування; бачать усі, хто увійшов */
  async file(id: string) {
    const t = await repo.findById(id);
    if (!t || !isExt(t.ext) || !(await storage.exists(t.storageKey))) throw notFound();
    return { path: storage.pathOf(t.storageKey), name: downloadName(t), ext: t.ext };
  },
};
