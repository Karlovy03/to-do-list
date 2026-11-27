import type { RequestHandler } from 'express';
import multer from 'multer';
import { badRequest, HttpError } from '../../core/http-error';
import { MAX_FILE_MB } from './templates.service';
import { templatesStorage } from './templates.storage';

/*
 * Приймання файлу (multer ≥ 2.1.0 — без DoS-вразливостей 2025–2026): одразу на диск, у тимчасову теку,
 * бо пам'яті в Node на сервері мало. Один файл, до 20 МБ, кілька коротких полів.
 * Імена файлів — UTF-8: браузери надсилають українські імена саме так.
 */
const parser = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      templatesStorage.ensure().then(() => cb(null, templatesStorage.tempDir()), (err: Error) => cb(err, ''));
    },
  }),
  defParamCharset: 'utf8',
  limits: { fileSize: MAX_FILE_MB << 20, files: 1, fields: 4, fieldSize: 2_000, parts: 6 },
}).single('file');

/** Тимчасовий файл прибирається, щойно відповідь завершилась (успіх, помилка чи обрив); прийнятий уже перенесено — тоді це нічого не робить */
export const receiveFile: RequestHandler = (req, res, next) => {
  parser(req, res, (err: unknown) => {
    const temp = req.file?.path;
    if (temp) res.on('close', () => void templatesStorage.discard(temp));
    if (!err) return next(req.file ? undefined : badRequest('template_file_required'));
    if (err instanceof multer.MulterError) return next(err.code === 'LIMIT_FILE_SIZE' ? new HttpError(413, 'template_too_large') : badRequest('template_bad_upload'));
    next(err);
  });
};
