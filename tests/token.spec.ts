import { describe, expect, it } from 'vitest';
import { safeReturnUrl, tokenExpired } from '../src/app/core/auth/token';

const token = (payload: object) => `header.${btoa(JSON.stringify(payload))}.signature`;
describe('JWT de navegación y retorno seguro', () => {
  it('rechaza tokens inválidos, expirados o sin exp', () => {
    expect(tokenExpired('invalid')).toBe(true);
    expect(tokenExpired(token({}))).toBe(true);
    expect(tokenExpired(token({exp: 1}))).toBe(true);
    expect(tokenExpired(token({exp: 9999999999}))).toBe(false);
  });
  it('no redirige a orígenes externos ni forma ciclos de autenticación', () => {
    for (const url of ['//evil.example', 'https://evil.example', '/\\evil.example', '/login', '/register?x=1', null]) {
      expect(safeReturnUrl(url)).toBe('/dashboard');
    }
    expect(safeReturnUrl('/negotiations/42')).toBe('/negotiations/42');
  });
});
