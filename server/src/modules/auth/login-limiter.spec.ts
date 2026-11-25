import { beforeEach, describe, expect, it } from 'vitest';
import { loginLimiter } from './login-limiter';

describe('обмеження спроб входу', () => {
  beforeEach(() => loginLimiter.reset());

  it('блокує логін після 10 невдалих спроб', () => {
    for (let i = 0; i < 9; i++) loginLimiter.fail('chief', '1.1.1.1');
    expect(loginLimiter.isBlocked('chief', '2.2.2.2')).toBe(false);
    loginLimiter.fail('chief', '1.1.1.1');
    expect(loginLimiter.isBlocked('chief', '2.2.2.2')).toBe(true);
  });

  it('успішний вхід під іншим акаунтом не скидає лічильник адреси', () => {
    for (let i = 0; i < 30; i++) loginLimiter.fail(`user${i}`, '1.1.1.1');
    loginLimiter.success('my-own-account');
    expect(loginLimiter.isBlocked('anyone', '1.1.1.1')).toBe(true);
  });

  it('блокування знімається після вікна 15 хвилин', () => {
    const t0 = Date.now();
    for (let i = 0; i < 10; i++) loginLimiter.fail('chief', '1.1.1.1', t0);
    expect(loginLimiter.isBlocked('chief', '1.1.1.1', t0 + 16 * 60_000)).toBe(false);
  });
});
