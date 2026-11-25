import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message ?? code);
  }
}

export const forbidden = (code = 'forbidden') => new HttpError(403, code);
export const notFound = (code = 'not_found') => new HttpError(404, code);
export const badRequest = (code = 'bad_request') => new HttpError(400, code);

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'validation', issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'internal' });
};
