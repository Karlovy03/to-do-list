import type { Request, Response } from 'express';
import contentDisposition from 'content-disposition';
import { badRequest, param } from '../../core/http-error';
import { viewerOf } from '../access';
import { listTemplatesQuery, updateTemplateSchema, uploadFields } from './templates.schemas';
import { serializeTemplate } from './templates.serializer';
import { templatesService as svc, type Upload } from './templates.service';

const MIME = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
} as const;

const uploaded = (req: Request): Upload => {
  if (!req.file) throw badRequest('template_file_required');
  return { path: req.file.path, originalname: req.file.originalname, size: req.file.size };
};

export const templatesController = {
  async list(req: Request, res: Response) {
    const viewer = await viewerOf(req);
    const page = await svc.list(listTemplatesQuery.parse(req.query));
    res.json({ items: page.rows.map((r) => serializeTemplate(r.row, viewer, r.hit)), hasMore: page.hasMore, total: page.total });
  },
  async create(req: Request, res: Response) {
    const viewer = await viewerOf(req);
    const fields = uploadFields.parse(req.body ?? {});
    res.status(201).json(serializeTemplate(await svc.create(viewer, uploaded(req), fields), viewer));
  },
  async update(req: Request, res: Response) {
    const viewer = await viewerOf(req);
    res.json(serializeTemplate(await svc.update(viewer, param(req, 'id'), updateTemplateSchema.parse(req.body)), viewer));
  },
  async replace(req: Request, res: Response) {
    const viewer = await viewerOf(req);
    res.json(serializeTemplate(await svc.replace(viewer, param(req, 'id'), uploaded(req)), viewer));
  },
  async remove(req: Request, res: Response) {
    await svc.remove(await viewerOf(req), param(req, 'id'));
    res.status(204).end();
  },
  /** Скачати; ?inline=1 — відкрити в браузері, лише PDF. Файл міг бути замінений — кеш перевіряється щоразу */
  async file(req: Request, res: Response) {
    const f = await svc.file(param(req, 'id'));
    const inline = req.query.inline === '1' && f.ext === 'pdf';
    res.sendFile(f.path, {
      headers: {
        'Content-Type': MIME[f.ext],
        'Content-Disposition': contentDisposition(f.name, { type: inline ? 'inline' : 'attachment' }),
        'Cache-Control': 'private, no-cache',
      },
    });
  },
};
