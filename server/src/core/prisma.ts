import { Prisma, PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

/** Клієнт бази: звичайний або всередині транзакції — репозиторії приймають обидва */
export type Db = PrismaClient | Prisma.TransactionClient;

/** Сервіс відкриває транзакцію, не торкаючись моделей напряму */
export const transaction = <T>(fn: (db: Prisma.TransactionClient) => Promise<T>) => prisma.$transaction(fn);

/** Порушено унікальність (напр. логін зайняли між перевіркою і записом) */
export const isUniqueViolation = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
