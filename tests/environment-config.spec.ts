import {describe, expect, it} from 'vitest';
// @ts-expect-error Node tooling is intentionally plain JavaScript.
import {resolveConfig} from '../scripts/runtime-config.mjs';

const defaults = {apiBaseUrl: '/api/backend', websocketUrl: '/api/backend/ws/events'};
describe('configuración pública mediante variables de entorno', () => {
  it('conserva el proxy local sin variables', () => {
    expect(resolveConfig(defaults, {})).toEqual(defaults);
  });
  it('deriva el bridge real desde una API con prefijo', () => {
    expect(resolveConfig(defaults, {API_BASE_URL: 'https://api.example.com/twin/'})).toEqual({
      apiBaseUrl: 'https://api.example.com/twin', websocketUrl: 'https://api.example.com/twin/ws/events',
    });
  });
  it('acepta una dirección WebSocket explícita', () => {
    expect(resolveConfig(defaults, {API_BASE_URL: 'http://127.0.0.1:8000', WEBSOCKET_URL: 'ws://127.0.0.1:8000/ws/events'}))
      .toEqual({apiBaseUrl: 'http://127.0.0.1:8000', websocketUrl: 'ws://127.0.0.1:8000/ws/events'});
  });
  it('no publica otras variables del proceso', () => {
    expect(resolveConfig(defaults, {UNRELATED_SECRET: 'not-public'})).toEqual(defaults);
  });
  it.each(['', 'api.example.com', '//api.example.com', 'https://user:pass@api.example.com',
    'https://api.example.com?token=x', 'javascript:alert(1)', 'https://api.example.com/#x'])('rechaza API inválida %s', value => {
    expect(() => resolveConfig(defaults, {API_BASE_URL: value})).toThrow();
  });
  it.each(['', 'wss://api.example.com/ws?token=x', 'ftp://api.example.com/ws'])('rechaza bridge inválido %s', value => {
    expect(() => resolveConfig(defaults, {WEBSOCKET_URL: value})).toThrow();
  });
});
