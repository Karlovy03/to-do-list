import { describe, expect, it } from 'vitest';
import { windowClass } from './useWindowClass';

describe('клас вікна', () => {
  it.each([
    [320, 350, 'xs'], // обкладинка Flip
    [344, 882, 'sm'], // Fold5 зовнішній — як телефон (макет МВС)
    [369, 905, 'sm'], // Fold6 зовнішній
    [412, 915, 'sm'], // Fold7 зовнішній, Galaxy A
    [690, 829, 'md'], // Fold5 внутрішній
    [750, 832, 'md'], // Fold7 внутрішній
    [984, 1092, 'md'],
    [1280, 800, 'lg'], // планшет / DeX
    [900, 400, 'xs'], // розкладений Flip у ландшафті — низьке вікно
  ])('%i×%i → %s', (w, h, c) => expect(windowClass(w, h)).toBe(c));
});
