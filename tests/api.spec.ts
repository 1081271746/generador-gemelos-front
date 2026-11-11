import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ApiService } from '../src/app/core/services/api.service';
import { ScenariosService } from '../src/app/core/services/scenarios.service';
import { NegotiationsService } from '../src/app/core/services/negotiations.service';
import { MessagesService } from '../src/app/core/services/messages.service';
import { AnalysesService } from '../src/app/core/services/analyses.service';
import { ProfileService } from '../src/app/core/services/profile.service';
import { AuthService } from '../src/app/core/auth/auth.service';
import { authInterceptor } from '../src/app/core/http/auth.interceptor';
import { RuntimeConfigService } from '../src/app/core/config/runtime-config.service';

const base = '/api/backend';
const user = {id: 1, username: 'test_student', email: 'student@example.com', is_active: true};
const validToken = () => `header.${btoa(JSON.stringify({exp: Math.floor(Date.now() / 1000) + 3600}))}.signature`;
const scenario = {title: 'Supply', description: 'Annual contract', context: 'Renewal', objective: 'Reduce costs',
  counterpart_role: 'Supplier', counterpart_goal: 'Protect margin', counterpart_limits: 'Minimum 100'};

describe('Servicios Angular y contrato FastAPI', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({providers: [
      provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
    ]});
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    TestBed.inject(AuthService).clear();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });
  it('registra y luego inicia sesión con email y contraseña reales', () => {
    let received: unknown;
    TestBed.inject(AuthService).register({...user, password: 'a-test-password-long'}).subscribe(value => received = value);
    const register = http.expectOne(base + '/auth/register');
    expect(register.request.method).toBe('POST');
    register.flush(user);
    const login = http.expectOne(base + '/auth/login');
    expect(login.request.body).toEqual({email: user.email, password: 'a-test-password-long'});
    const token = validToken();
    login.flush({access_token: token, token_type: 'bearer'});
    const me = http.expectOne(base + '/auth/me');
    expect(me.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    me.flush(user);
    expect(received).toEqual(user);
  });
  it('no adjunta Bearer a otros dominios ni otras rutas', () => {
    const config = TestBed.inject(RuntimeConfigService);
    expect(config.owns('https://other.example/api/backend')).toBe(false);
    expect(config.owns('/api/backend-other')).toBe(false);
    expect(config.owns('/api/backend/profile')).toBe(true);
  });
  it('restaura una sesión persistida comprobándola con el servidor', () => {
    const token = validToken();
    sessionStorage.setItem('gemelos.session', token);
    const auth = TestBed.inject(AuthService);
    auth.restore().subscribe();
    const request = http.expectOne(base + '/auth/me');
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    request.flush(user);
    expect(auth.user()).toEqual(user);
    expect(auth.ready()).toBe(true);
  });
  it('elimina borradores privados al salir sin borrar datos ajenos', () => {
    sessionStorage.setItem('gemelos.pending.1.4', '{"content":"draft"}');
    sessionStorage.setItem('unrelated-key', 'keep');
    const auth = TestBed.inject(AuthService);
    auth.clear();
    expect(sessionStorage.getItem('gemelos.pending.1.4')).toBeNull();
    expect(sessionStorage.getItem('unrelated-key')).toBe('keep');
    expect(auth.user()).toBeNull();
    expect(auth.token()).toBeNull();
  });
  it('no crea sesión cuando el servidor rechaza las credenciales', () => {
    const auth = TestBed.inject(AuthService);
    let failed = false;
    auth.login({email: user.email, password: 'wrong-password'}).subscribe({error: () => failed = true});
    http.expectOne(base + '/auth/login').flush({detail: 'Invalid credentials'}, {status: 401, statusText: 'Unauthorized'});
    expect(failed).toBe(true);
    expect(auth.token()).toBeNull();
    expect(auth.user()).toBeNull();
    http.expectNone(base + '/auth/me');
  });
  it('no transmite JWT a una solicitud externa aunque exista sesión', () => {
    sessionStorage.setItem('gemelos.session', validToken());
    TestBed.inject(HttpClient).get('https://external.example/resource').subscribe();
    const request = http.expectOne('https://external.example/resource');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
  it('recorre todas las páginas sin inventar estadísticas', () => {
    let records: number[] = [];
    TestBed.inject(ApiService).all<number>('/scenarios/', 2).subscribe(value => records = value);
    http.expectOne(base + '/scenarios/?offset=0&limit=2').flush([1, 2]);
    http.expectOne(base + '/scenarios/?offset=2&limit=2').flush([3]);
    expect(records).toEqual([1, 2, 3]);
  });
  it('crea y edita exactamente los siete campos del escenario', () => {
    const service = TestBed.inject(ScenariosService);
    service.create(scenario).subscribe();
    const create = http.expectOne(base + '/scenarios/');
    expect(create.request.body).toEqual(scenario);
    create.flush({...scenario, id: 4});
    service.update(4, scenario).subscribe();
    const edit = http.expectOne(base + '/scenarios/4');
    expect(edit.request.method).toBe('PUT');
    edit.flush({...scenario, id: 4});
  });
  it('archiva mediante DELETE sin borrar historial en el cliente', () => {
    TestBed.inject(ScenariosService).archive(4).subscribe();
    const request = http.expectOne(base + '/scenarios/4');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, {status: 204, statusText: 'No Content'});
  });
  it('inicia la negociación con scenario_id y cierra con resultado', () => {
    const service = TestBed.inject(NegotiationsService);
    service.create(4).subscribe();
    const create = http.expectOne(base + '/negotiations/');
    expect(create.request.body).toEqual({scenario_id: 4});
    create.flush({id: 10});
    service.finish(10, 'completed', 'Agreement').subscribe();
    const finish = http.expectOne(base + '/negotiations/10');
    expect(finish.request.body).toEqual({status: 'completed', result: 'Agreement'});
    expect(finish.request.method).toBe('PATCH');
    finish.flush({id: 10});
  });
  it('envía una sola solicitud por turno y conserva los dos mensajes', () => {
    const input = {negotiation_id: 10, content: 'Offer 100', kind: 'offer' as const, request_id: crypto.randomUUID()};
    let messages: unknown;
    TestBed.inject(MessagesService).send(input).subscribe(value => messages = value);
    const request = http.expectOne(base + '/messages/');
    expect(request.request.body).toEqual(input);
    request.flush([{id: 1, sender_type: 'user'}, {id: 2, sender_type: 'twin'}]);
    expect(messages).toHaveLength(2);
  });
  it('consulta historial con límite real de mensajes', () => {
    TestBed.inject(MessagesService).list(10).subscribe();
    http.expectOne(base + '/messages/10?offset=0&limit=500').flush([]);
  });
  it('genera análisis con el endpoint real y sin datos de IA del cliente', () => {
    TestBed.inject(AnalysesService).generate(10).subscribe();
    const request = http.expectOne(base + '/negotiations/10/analysis');
    expect(request.request.body).toEqual({});
    request.flush({id: 1});
  });
  it('distingue perfil recomendaciones y ejercicios curados', () => {
    const service = TestBed.inject(ProfileService);
    service.get().subscribe();
    http.expectOne(base + '/profile').flush({sample_count: 0, payload: {evolution: []}});
    service.recommendations().subscribe();
    http.expectOne(base + '/recommendations').flush({recommendations: [], exercises: []});
    service.resources().subscribe();
    http.expectOne(base + '/resources/exercises').flush({source: 'curated_examples', exercises: []});
  });
});
