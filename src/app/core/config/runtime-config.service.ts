import { Injectable } from '@angular/core';

export interface RuntimeSettings { apiBaseUrl: string; websocketUrl: string }

@Injectable({providedIn: 'root'})
export class RuntimeConfigService {
  private settings: RuntimeSettings = {apiBaseUrl: '/api/backend', websocketUrl: '/api/backend/ws/events'};

  async load(): Promise<void> {
    const response = await fetch(new URL('config.json', document.baseURI), {cache: 'no-store'});
    if (!response.ok) throw new Error('No se pudo cargar la configuración de conexión.');
    const value: unknown = await response.json();
    if (!value || typeof value !== 'object' || !('apiBaseUrl' in value) || !('websocketUrl' in value)
      || typeof value.apiBaseUrl !== 'string' || typeof value.websocketUrl !== 'string') {
      throw new Error('La configuración de conexión no es válida.');
    }
    const api = new URL(value.apiBaseUrl, location.origin);
    const socket = new URL(value.websocketUrl, location.origin);
    if (!['http:', 'https:'].includes(api.protocol) || !['http:', 'https:', 'ws:', 'wss:'].includes(socket.protocol)
      || api.username || api.password || socket.username || socket.password || api.search || api.hash) {
      throw new Error('La dirección del backend no es válida.');
    }
    if (location.protocol === 'https:' && (api.protocol === 'http:' || ['http:', 'ws:'].includes(socket.protocol))) {
      throw new Error('Una aplicación HTTPS requiere un backend HTTPS y WebSocket seguro.');
    }
    this.settings = {apiBaseUrl: api.href.replace(/\/$/, ''), websocketUrl: socket.href};
  }

  url(path: string): string { return `${this.settings.apiBaseUrl}${path}`; }
  owns(url: string): boolean {
    const request = new URL(url, location.origin);
    const base = new URL(this.settings.apiBaseUrl, location.origin);
    return request.origin === base.origin && (request.pathname === base.pathname || request.pathname.startsWith(base.pathname.replace(/\/$/, '') + '/'));
  }
  socketUrl(): string {
    const url = new URL(this.settings.websocketUrl, location.origin);
    if (url.protocol === 'http:') url.protocol = 'ws:';
    if (url.protocol === 'https:') url.protocol = 'wss:';
    return url.href;
  }
}
