import { describe, expect, it } from 'vitest';
import { checkUser } from './userForm';

const ok = { fullName: 'Карлов Ярослав Петрович', position: '', login: 'karlov@example.org', role: 'MEMBER' as const, unitId: null, password: 'demo12345' };

describe('перевірка форми користувача', () => {
  it('пропускає пошту як логін', () => {
    expect(checkUser(ok, true)).toEqual({});
  });
  it('показує помилку біля кожного поля окремо', () => {
    expect(checkUser({ ...ok, fullName: 'Я', login: 'петро', password: '123' }, true)).toEqual({
      fullName: 'admin.users.name_short',
      login: 'admin.users.login_invalid',
      password: 'admin.users.password_short',
    });
  });
  it('при редагуванні порожній пароль означає «не змінювати»', () => {
    expect(checkUser({ ...ok, password: '' }, false)).toEqual({});
  });
});
