import { describe, expect, it } from 'vitest';
import { keyBytes } from './keyBytes';

describe('keyBytes', () => {
  it('розкодовує base64url без доповнення', () => {
    expect([...keyBytes('AQID_-8')]).toEqual([1, 2, 3, 255, 239]);
  });
});
