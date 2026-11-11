import { Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { RuntimeConfigService } from '../config/runtime-config.service';
import { NegotiationEvent } from '../../shared/models/api.models';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'unavailable';

export function validEvent(value: unknown): value is NegotiationEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<NegotiationEvent>;
  return typeof event.event_id === 'string' && Number.isSafeInteger(event.sequence)
    && event.sequence! > 0 && Number.isSafeInteger(event.negotiation_id)
    && typeof event.event_type === 'string' && typeof event.created_at === 'string'
    && typeof event.payload === 'object' && event.payload !== null;
}

@Injectable({providedIn: 'root'})
export class EventsService {
  private auth = inject(AuthService);
  private config = inject(RuntimeConfigService);
  private stateSignal = signal<ConnectionState>('disconnected');
  readonly state = this.stateSignal.asReadonly();
  private eventsSubject = new Subject<NegotiationEvent>();
  readonly events$ = this.eventsSubject.asObservable();
  private socket: WebSocket | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private timeout: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  private negotiationId = 0;
  private userId: number | null = null;
  private cursors = new Map<string, number>();
  private retries = 0;

  constructor() {
    this.auth.sessionChanged.subscribe(() => {
      this.disconnect();
      this.cursors.clear();
      this.userId = null;
    });
    window.addEventListener('online', () => {
      if (this.state() === 'unavailable' && this.auth.user()) this.connect(this.negotiationId);
    });
  }
  connect(negotiationId = 0): void {
    this.disconnect();
    this.userId = this.auth.user()?.id ?? null;
    if (!this.userId || !this.auth.token()) return;
    this.negotiationId = negotiationId;
    this.retries = 0;
    this.open(this.generation);
  }
  disconnect(): void {
    this.generation++;
    clearTimeout(this.timer);
    clearTimeout(this.timeout);
    const previous = this.socket;
    this.socket = null;
    if (previous) { previous.onclose = null; previous.close(); }
    this.stateSignal.set('disconnected');
  }
  private key(): string { return `${this.userId}:${this.negotiationId}`; }
  private open(generation: number): void {
    const token = this.auth.token();
    if (generation !== this.generation || !token || !this.userId) return;
    this.stateSignal.set(this.retries ? 'reconnecting' : 'connecting');
    let socket: WebSocket;
    try { socket = new WebSocket(this.config.socketUrl()); } catch { this.retry(generation); return; }
    this.socket = socket;
    this.timeout = setTimeout(() => { if (this.socket === socket) socket.close(); }, 12000);
    socket.onopen = () => {
      if (generation !== this.generation) { socket.close(); return; }
      clearTimeout(this.timeout);
      socket.send(JSON.stringify({token, negotiation_id: this.negotiationId, after_sequence: this.cursors.get(this.key()) || 0}));
      this.stateSignal.set('connected');
    };
    socket.onmessage = message => {
      if (generation !== this.generation || this.auth.user()?.id !== this.userId) return;
      try {
        const event: unknown = JSON.parse(String(message.data));
        if (!validEvent(event) || event.sequence <= (this.cursors.get(this.key()) || 0)
          || (this.negotiationId > 0 && event.negotiation_id !== this.negotiationId)) return;
        this.cursors.set(this.key(), event.sequence);
        this.retries = 0;
        this.eventsSubject.next(event);
      } catch { }
    };
    socket.onclose = event => {
      clearTimeout(this.timeout);
      if (generation !== this.generation) return;
      this.socket = null;
      if (event.code === 4401 || event.code === 4403) {
        this.stateSignal.set('unavailable');
        if (event.code === 4401) this.auth.clear();
        return;
      }
      this.retry(generation);
    };
    socket.onerror = () => { if (socket.readyState !== WebSocket.CLOSED) socket.close(); };
  }
  private retry(generation: number): void {
    if (generation !== this.generation) return;
    if (++this.retries > 6 || !navigator.onLine) { this.stateSignal.set('unavailable'); return; }
    this.stateSignal.set('reconnecting');
    this.timer = setTimeout(() => this.open(generation), Math.min(15000, 500 * 2 ** this.retries));
  }
}
