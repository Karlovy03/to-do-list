import { z } from 'zod';

// латиниця, цифри і . _ - @ + — щоб логіном могла бути службова пошта
export const LOGIN_RE = /^[a-z0-9._@+-]{3,100}$/;
const login = z.string().trim().toLowerCase().regex(LOGIN_RE);
const fullName = z.string().trim().min(3).max(150);
const position = z.string().trim().max(200);
const role = z.enum(['ADMIN', 'DIRECTOR', 'MANAGER', 'MEMBER']);
// підрозділ (ADR-0012); null — не вказано
const unitId = z.string().min(1).nullable();
// bcrypt враховує лише перші 72 байти
export const password = z.string().min(8).max(72);

export const createUserSchema = z.object({ login, fullName, position: position.default(''), role, password, unitId: unitId.default(null) });

// Окрема схема оновлення без default — інакше відсутнє поле затирається
export const updateUserSchema = z
  .object({ login, fullName, position, role, password, unitId, isActive: z.boolean() })
  .partial();

export const listUsersQuery = z.object({ all: z.enum(['0', '1']).optional() });
