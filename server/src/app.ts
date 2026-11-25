import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { config } from './lib/config';
import { loadUser, requireAuth } from './lib/auth';
import { errorHandler, notFound } from './lib/http';
import { authRouter } from './routes/auth';
import { tasksRouter } from './routes/tasks';
import { usersRouter } from './routes/users';
import { controllersRouter } from './routes/controllers';
import { notificationsRouter, pushRouter } from './routes/notifications';
import { settingsRouter } from './routes/settings';

// Мобільні застосунки Capacitor звертаються до API зі своїх локальних адрес
const NATIVE_ORIGINS = new Set(['capacitor://localhost', 'https://localhost', 'http://localhost']);

const nativeCors: express.RequestHandler = (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && NATIVE_ORIGINS.has(origin) && req.path.startsWith('/api/')) {
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

export function createApp() {
  const app = express();
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(nativeCors);
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());
  app.use(loadUser);

  const api = express.Router();
  api.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  api.use('/auth', authRouter);
  api.use(requireAuth);
  api.use('/tasks', tasksRouter);
  api.use('/users', usersRouter);
  api.use('/controllers', controllersRouter);
  api.use('/notifications', notificationsRouter);
  api.use('/push', pushRouter);
  api.use('/settings', settingsRouter);
  api.use((_req, _res, next) => next(notFound()));
  app.use('/api', api);

  // У продакшені сервер сам віддає зібраний клієнт (один контейнер)
  if (fs.existsSync(config.clientDist)) {
    app.use(express.static(config.clientDist, { index: false, maxAge: '1h' }));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(config.clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
