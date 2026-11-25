import { PrismaClient, type Prisma } from '@prisma/client';

export const prisma = new PrismaClient();

/** Клієнт бази: звичайний або всередині транзакції — репозиторії приймають обидва */
export type Db = PrismaClient | Prisma.TransactionClient;

/** Сервіс відкриває транзакцію, не торкаючись моделей напряму */
export const transaction = <T>(fn: (db: Prisma.TransactionClient) => Promise<T>) => prisma.$transaction(fn);
