import type { ErrorRequestHandler, Request } from 'express';
import { ZodError } from 'zod';

/** Помилка з машинним кодом; людський текст до коду — у YAML клієнта. details — що підставити в текст (напр. назва дубліката) */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    public details?: Record<string, string>,
  ) {
    super(code);
  }
}

export const badRequest = (code = 'bad_request') => new HttpError(400, code);
export const unauthorized = (code = 'unauthorized') => new HttpError(401, code);
export const forbidden = (code = 'forbidden') => new HttpError(403, code);
export const notFound = (code = 'not_found') => new HttpError(404, code);
export const conflict = (code = 'conflict') => new HttpError(409, code);

/** Express 5 типізує params як string | string[] */
export const param = (req: Request, name: string) => String(req.params[name]);

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ ...err.details, error: err.code });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'validation', issues: err.issues.map((i) => ({ path: i.path.join('.'), code: i.code })) });
    return;
  }
  if ((err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({ error: 'bad_json' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'internal' });
};
