import type { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma';

export const settingsRepository = {
  get: (key: string) => prisma.setting.findUnique({ where: { key } }),
  put: (key: string, value: Prisma.InputJsonValue) =>
    prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } }),
};
