import { describe, expect, it } from 'vitest';
import { createUserSchema } from './users.schemas';

const base = { fullName: 'Карлов Ярослав', role: 'MEMBER' as const, password: 'demo12345' };

describe('логін користувача', () => {
  it('приймає службову пошту як логін і зводить її до нижнього регістру', () => {
    expect(createUserSchema.parse({ ...base, login: ' Ivan.Petrenko@Police.gov.ua ' }).login).toBe('ivan.petrenko@police.gov.ua');
  });
  it('приймає звичайний логін', () => {
    expect(createUserSchema.parse({ ...base, login: 'chief' }).login).toBe('chief');
  });
  it('відхиляє кирилицю, пробіли і надто короткий логін', () => {
    for (const login of ['петренко', 'ivan petrenko', 'ab']) expect(createUserSchema.safeParse({ ...base, login }).success).toBe(false);
  });
});
