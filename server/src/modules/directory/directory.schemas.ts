import { z } from 'zod';

const fullName = z.string().trim().min(3).max(150);
const position = z.string().trim().max(200);
const organization = z.string().trim().max(200);

export const createPersonSchema = z.object({ fullName, position: position.default(''), organization: organization.default('') });
// без default — інакше відсутні поля затираються
export const updatePersonSchema = z.object({ fullName, position, organization, isActive: z.boolean() }).partial();
export const listQuery = z.object({ all: z.enum(['0', '1']).optional() });
