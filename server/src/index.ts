import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { config } from './lib/config';
import { prisma } from './lib/prisma';
import { createApp } from './app';
import { initPush } from './modules/notifications/push.web';
import { startReminderLoop, stopReminderLoop } from './modules/notifications/reminders';

/** Перший запуск: якщо користувачів немає — створюємо адміністратора */
async function bootstrapAdmin() {
  if ((await prisma.user.count()) > 0) return;
  const login = (process.env.ADMIN_LOGIN ?? 'admin').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? crypto.randomBytes(9).toString('base64url');
  await prisma.user.create({
    data: { login, fullName: 'Адміністратор', role: 'ADMIN', passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`[bootstrap] створено адміністратора: ${login}${process.env.ADMIN_PASSWORD ? '' : ` / пароль: ${password}`}`);
}

async function main() {
  await bootstrapAdmin();
  await initPush();
  const server = createApp().listen(config.port, () => console.log(`[server] http://localhost:${config.port}`));
  startReminderLoop(config.reminderTickMs);
  const shutdown = () => {
    stopReminderLoop();
    server.close(() => void prisma.$disconnect().then(() => process.exit(0)));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

void main();
