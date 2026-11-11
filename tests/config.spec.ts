import { afterEach, describe, expect, it, vi } from 'vitest';
import { RuntimeConfigService } from '../src/app/core/config/runtime-config.service';

describe('Configuración pública del backend', () => {
  afterEach(() => {vi.unstubAllGlobals();});
  const configResponse = (body: unknown) => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {status: 200})));
  it('carga HTTP y convierte el protocolo del WebSocket', async () => {
    configResponse({apiBaseUrl: 'https://api.example.com/', websocketUrl: 'https://api.example.com/ws/events'});
    const config = new RuntimeConfigService();
    await config.load();
    expect(config.url('/auth/me')).toBe('https://api.example.com/auth/me');
    expect(config.socketUrl()).toBe('wss://api.example.com/ws/events');
    expect(config.owns('https://api.example.com/profile')).toBe(true);
    expect(config.owns('https://other.example.com/profile')).toBe(false);
  });
  it('rechaza configuración incompleta sin usar datos de demostración', async () => {
    configResponse({apiBaseUrl: 'https://api.example.com'});
    await expect(new RuntimeConfigService().load()).rejects.toThrow('configuración');
  });
  it.each(['javascript:alert(1)', 'https://user:password@api.example.com', 'https://api.example.com?token=x'])('rechaza direcciones inseguras %s', async apiBaseUrl => {
    configResponse({apiBaseUrl, websocketUrl: 'wss://api.example.com/ws'});
    await expect(new RuntimeConfigService().load()).rejects.toThrow();
  });
  it('no permite API HTTP desde una app HTTPS', async () => {
    vi.stubGlobal('location', {origin: 'https://app.example.com', protocol: 'https:'});
    configResponse({apiBaseUrl: 'http://api.example.com', websocketUrl: 'ws://api.example.com/ws'});
    await expect(new RuntimeConfigService().load()).rejects.toThrow('HTTPS');
  });
});
