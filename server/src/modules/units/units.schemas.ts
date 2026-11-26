import { z } from 'zod';

const name = z.string().trim().min(2).max(200);
const parentId = z.string().min(1).nullable();

export const createUnitSchema = z.object({ name, parentId: parentId.default(null) });
// без default — інакше відсутнє поле затерло б батьківський підрозділ
export const updateUnitSchema = z.object({ name, parentId }).partial();
