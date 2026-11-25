import { config } from './core/config';
import { prisma } from './core/prisma';
import { createApp } from './app';
import { usersService } from './modules/users';
import { initWebPush, startReminderLoop, stopReminderLoop } from './modules/notifications';

async function main() {
  await usersService.ensureAdmin();
  await initWebPush();
  const server = createApp().listen(config.PORT, () => console.log(`[server] http://localhost:${config.PORT}`));
  startReminderLoop(config.REMINDER_TICK_MS);
  const shutdown = () => {
    stopReminderLoop();
    server.close(() => void prisma.$disconnect().then(() => process.exit(0)));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

void main();
