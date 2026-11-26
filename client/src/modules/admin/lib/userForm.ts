import type { UserInput } from '../api/admin.api';

/** Ті самі правила, що й на сервері (users.schemas.ts) — щоб показати помилку біля поля, а не загальну */
const LOGIN_RE = /^[a-z0-9._@+-]{3,100}$/;

export type UserFieldErrors = Partial<Record<'fullName' | 'login' | 'password', string>>;

export function checkUser(v: UserInput, isNew: boolean): UserFieldErrors {
  const e: UserFieldErrors = {};
  if (v.fullName.trim().length < 3) e.fullName = 'admin.users.name_short';
  if (!LOGIN_RE.test(v.login.trim().toLowerCase())) e.login = 'admin.users.login_invalid';
  if ((isNew || v.password) && (v.password ?? '').length < 8) e.password = 'admin.users.password_short';
  return e;
}
