import type { DevicePlatform } from '@prisma/client';
import { prisma } from '../../core/prisma';

/** Куди доставляти push: підписки браузерів і токени мобільних застосунків */
export const subscriptionsRepository = {
  webForUser: (userId: string) => prisma.pushSubscription.findMany({ where: { userId } }),
  devicesForUser: (userId: string) => prisma.deviceToken.findMany({ where: { userId } }),

  upsertWeb: (userId: string, endpoint: string, p256dh: string, auth: string, userAgent: string) =>
    prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh, auth, userAgent },
      update: { userId, p256dh, auth, userAgent },
    }),
  upsertDevice: (userId: string, token: string, platform: DevicePlatform, sandbox: boolean) =>
    prisma.deviceToken.upsert({
      where: { token },
      create: { userId, token, platform, sandbox },
      update: { userId, platform, sandbox },
    }),

  removeWeb: (id: string) => prisma.pushSubscription.delete({ where: { id } }).catch(() => undefined),
  removeDevice: (id: string) => prisma.deviceToken.delete({ where: { id } }).catch(() => undefined),

  async removeForUser(userId: string, d: { pushEndpoint?: string; deviceToken?: string }) {
    if (d.pushEndpoint) await prisma.pushSubscription.deleteMany({ where: { userId, endpoint: d.pushEndpoint } });
    if (d.deviceToken) await prisma.deviceToken.deleteMany({ where: { userId, token: d.deviceToken } });
  },
  async removeAllForUser(userId: string) {
    await prisma.$transaction([
      prisma.pushSubscription.deleteMany({ where: { userId } }),
      prisma.deviceToken.deleteMany({ where: { userId } }),
    ]);
  },
};

/** Публічний інтерфейс для інших модулів (вихід із системи) */
export const pushSubscriptions = {
  removeAllForUser: subscriptionsRepository.removeAllForUser,
};
