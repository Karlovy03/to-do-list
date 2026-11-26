import { z } from 'zod';

// латиниця, цифри і . _ - @ + — щоб логіном могла бути службова пошта
export const LOGIN_RE = /^[a-z0-9._@+-]{3,100}$/;
const login = z.string().trim().toLowerCase().regex(LOGIN_RE);
const fullName = z.string().trim().min(3).max(150);
const position = z.string().trim().max(200);
const role = z.enum(['ADMIN', 'MANAGER', 'MEMBER']);
// bcrypt враховує лише перші 72 байти
export const password = z.string().min(8).max(72);

export const createUserSchema = z.object({ login, fullName, position: position.default(''), role, password });

// Окрема схема оновлення без default — інакше відсутнє поле затирається
export const updateUserSchema = z
  .object({ login, fullName, position, role, password, isActive: z.boolean() })
  .partial();

export const listUsersQuery = z.object({ all: z.enum(['0', '1']).optional() });
