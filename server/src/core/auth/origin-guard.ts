import type { RequestHandler } from 'express';
import { forbidden } from '../http-error';

/** Мобільні застосунки Capacitor звертаються зі своїх локальних адрес */
export const NATIVE_ORIGINS = new Set(['capacitor://localhost', 'https://localhost']);

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Захист від CSRF понад sameSite=strict: запит, що змінює дані, з чужого Origin відхиляється.
 * Без Origin (curl, серверні клієнти) — пропускаємо: cookie там не підставляється браузером.
 */
export const originGuard: RequestHandler = (req, _res, next) => {
  const origin = req.headers.origin;
  if (!UNSAFE.has(req.method) || !origin || NATIVE_ORIGINS.has(origin)) return next();
  try {
    if (new URL(origin).host === req.headers.host) return next();
  } catch {
    /* некоректний Origin */
  }
  next(forbidden('bad_origin'));
};

/** CORS лише для мобільних застосунків; веб працює з того ж домену */
export const nativeCors: RequestHandler = (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && NATIVE_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Client');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
  }
  next();
};
