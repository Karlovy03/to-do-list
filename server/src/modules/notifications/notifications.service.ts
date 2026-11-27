import type { User } from '@prisma/client';
import type { z } from 'zod';
import { tx } from '../../core/texts';
import { FEED_PAGE, feedRepository } from './feed.repository';
import { pushToUser } from './push/dispatcher';
import { subscriptionsRepository } from './subscriptions.repository';
import { remindersRepository } from './reminders/reminders.repository';
import type { deviceSchema, webSubscriptionSchema } from './notifications.schemas';
import { announce } from '../live';

export const notificationsService = {
  async feed(user: User, offset: number) {
    const [rows, unread] = await Promise.all([feedRepository.list(user.id, offset), feedRepository.unreadCount(user.id)]);
    return { items: rows.slice(0, FEED_PAGE), unread, hasMore: rows.length > FEED_PAGE };
  },
  /** Прочитане на одному пристрої — лічильник оновлюється й на інших (ADR-0021) */
  async markRead(user: User, ids?: string[]) {
    const r = await feedRepository.markRead(user.id, ids);
    announce({ t: 'feed' }, (v) => v.id === user.id);
    return r;
  },

  subscribeWeb: (user: User, s: z.infer<typeof webSubscriptionSchema>, userAgent: string) =>
    subscriptionsRepository.upsertWeb(user.id, s.endpoint, s.keys.p256dh, s.keys.auth, userAgent.slice(0, 300)),
  unsubscribeWeb: (user: User, endpoint: string) => subscriptionsRepository.removeForUser(user.id, { pushEndpoint: endpoint }),
  registerDevice: (user: User, d: z.infer<typeof deviceSchema>) => subscriptionsRepository.upsertDevice(user.id, d.token, d.platform, d.sandbox),

  sendTest: (user: User) =>
    pushToUser(user.id, {
      title: tx('notifications.push.test_title'),
      body: tx('notifications.push.test_body'),
      url: '/settings',
      tag: 'test',
      actions: { open: tx('notifications.push.action_open') },
    }),
};

/** Відкласти нагадування по завданню для людини (перевірку доступу робить модуль tasks) */
export const snoozeReminders = (taskId: string, userId: string, minutes: number) => {
  const until = new Date(Date.now() + minutes * 60_000);
  return remindersRepository.snooze(taskId, userId, until).then(() => until);
};
