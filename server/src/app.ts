import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { config } from './core/config';
import { loadUser, nativeCors, originGuard, requireAuth } from './core/auth';
import { errorHandler, notFound } from './core/http-error';
import { authRouter } from './modules/auth';
import { profileRouter } from './modules/profile';
import { usersRouter } from './modules/users';
import { directoryRouter } from './modules/directory';
import { unitsRouter } from './modules/units';
import { settingsRouter } from './modules/settings';
import { tasksRouter } from './modules/tasks';
import { eventsRouter } from './modules/events';
import { calendarRouter } from './modules/calendar';
import { absencesRouter } from './modules/absences';
import { notificationsRouter, pushRouter } from './modules/notifications';
import { liveRouter } from './modules/live';

export function createApp() {
  const app = express();
  app.set('trust proxy', config.TRUST_PROXY_HOPS);
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          // стилі React (style={{ width }}) — атрибути; зовнішніх стилів немає
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          workerSrc: ["'self'"],
          manifestSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );
  app.use(nativeCors);
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());

  const api = express.Router();
  api.use(originGuard);
  api.use(loadUser);
  api.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  api.use('/auth', authRouter);
  api.use(requireAuth);
  api.use('/profile', profileRouter);
  api.use('/users', usersRouter);
  api.use('/directory', directoryRouter);
  api.use('/units', unitsRouter);
  api.use('/settings', settingsRouter);
  api.use('/tasks', tasksRouter);
  api.use('/events', eventsRouter);
  api.use('/calendar', calendarRouter);
  api.use('/absences', absencesRouter);
  api.use('/notifications', notificationsRouter);
  api.use('/push', pushRouter);
  api.use('/live', liveRouter);
  api.use((_req, _res, next) => next(notFound()));
  app.use('/api', api);

  // У продакшені сервер віддає зібраний клієнт (один образ, ADR-0009)
  if (fs.existsSync(config.clientDist)) {
    app.use(
      express.static(config.clientDist, {
        index: false,
        maxAge: '1h',
        // номер збірки має бути свіжим: за ним відкриті застосунки дізнаються про оновлення
        setHeaders: (res, file) => {
          if (path.basename(file) === 'version.json') res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(config.clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
