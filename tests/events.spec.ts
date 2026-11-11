import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { EventsService, validEvent } from '../src/app/core/services/events.service';
import { AuthService } from '../src/app/core/auth/auth.service';
import { RuntimeConfigService } from '../src/app/core/config/runtime-config.service';

class FakeSocket {
  static CLOSED = 3;
  static instances: FakeSocket[] = [];
  readyState = 1;
  onopen: (() => void) | null = null;
  onmessage: ((message: {data: string}) => void) | null = null;
  onclose: ((event: {code: number}) => void) | null = null;
  onerror: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => { this.readyState = 3; });
  constructor(public url: string) { FakeSocket.instances.push(this); }
}
const event = {type: 'event', event_id: 'evt-1', sequence: 1, negotiation_id: 7,
  event_type: 'message.created', payload: {}, created_at: '2026-11-11T00:00:00Z'};

describe('Eventos de negociación por WebSocket', () => {
  const sessionChanged = new Subject<void>();
  const currentUser = signal<{id: number} | null>({id: 1});
  let service: EventsService;
  beforeEach(() => {
    vi.useFakeTimers();
    FakeSocket.instances = [];
    currentUser.set({id: 1});
    vi.stubGlobal('WebSocket', FakeSocket);
    TestBed.configureTestingModule({providers: [
      {provide: AuthService, useValue: {user: currentUser, token: () => currentUser() ? 'session-token' : null, sessionChanged, clear: () => {currentUser.set(null); sessionChanged.next();}}},
      {provide: RuntimeConfigService, useValue: {socketUrl: () => 'ws://localhost:8000/ws/events'}},
    ]});
    service = TestBed.inject(EventsService);
  });
  afterEach(() => {TestBed.resetTestingModule(); vi.useRealTimers(); vi.unstubAllGlobals();});
  it('autentica en el primer frame sin poner JWT en la URL', () => {
    service.connect(7);
    const socket = FakeSocket.instances[0];
    expect(socket.url).not.toContain('session-token');
    socket.onopen?.();
    expect(JSON.parse(socket.send.mock.calls[0][0])).toEqual({token: 'session-token', negotiation_id: 7, after_sequence: 0});
    expect(service.state()).toBe('connected');
  });
  it('deduplica secuencias y rechaza eventos de otra negociación', () => {
    const received: unknown[] = [];
    service.events$.subscribe(value => received.push(value));
    service.connect(7);
    const socket = FakeSocket.instances[0];
    socket.onmessage?.({data: JSON.stringify(event)});
    socket.onmessage?.({data: JSON.stringify(event)});
    socket.onmessage?.({data: JSON.stringify({...event, sequence: 2, negotiation_id: 8})});
    socket.onmessage?.({data: 'invalid'});
    expect(received).toHaveLength(1);
  });
  it('reconecta con el cursor confirmado', () => {
    service.connect(7);
    const socket = FakeSocket.instances[0];
    socket.onmessage?.({data: JSON.stringify(event)});
    socket.onclose?.({code: 1013});
    expect(service.state()).toBe('reconnecting');
    vi.advanceTimersByTime(1000);
    const next = FakeSocket.instances[1];
    next.onopen?.();
    expect(JSON.parse(next.send.mock.calls[0][0]).after_sequence).toBe(1);
  });
  it('limpia cursores y conexión al cambiar la sesión', () => {
    service.connect(7);
    const first = FakeSocket.instances[0];
    first.onmessage?.({data: JSON.stringify(event)});
    sessionChanged.next();
    expect(first.close).toHaveBeenCalled();
    expect(service.state()).toBe('disconnected');
    currentUser.set({id: 2});
    service.connect(7);
    const next = FakeSocket.instances[1];
    next.onopen?.();
    expect(JSON.parse(next.send.mock.calls[0][0]).after_sequence).toBe(0);
  });
  it('detiene reintentos cuando la autorización es denegada', () => {
    service.connect(7);
    FakeSocket.instances[0].onclose?.({code: 4403});
    vi.advanceTimersByTime(60000);
    expect(service.state()).toBe('unavailable');
    expect(FakeSocket.instances).toHaveLength(1);
  });
  it('rechaza estructuras que no son eventos válidos', () => {
    expect(validEvent(null)).toBe(false);
    expect(validEvent({...event, sequence: -1})).toBe(false);
    expect(validEvent(event)).toBe(true);
  });
});
