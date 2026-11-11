import assert from 'node:assert/strict';
import {randomBytes, randomUUID} from 'node:crypto';

const base = (process.argv.find(value => /^https?:\/\//.test(value)) || 'http://localhost:8000').replace(/\/$/, '');
if (!process.argv.includes('--allow-write')) throw new Error('Esta prueba crea registros de desarrollo. Añade --allow-write para ejecutarla.');
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname) && !process.argv.includes('--allow-remote')) {
  throw new Error('Solo se permite localhost por defecto. No uses datos de producción para estas pruebas.');
}
let token;
let passed = 0;
async function request(path, {method = 'GET', body, expected = 200, authorized = true} = {}) {
  const response = await fetch(base + path, {method, headers: {
    ...(body ? {'Content-Type': 'application/json'} : {}),
    ...(authorized && token ? {Authorization: `Bearer ${token}`} : {}),
  }, ...(body ? {body: JSON.stringify(body)} : {})});
  assert.equal(response.status, expected, `${method} ${path}: estado inesperado ${response.status}`);
  const value = response.status === 204 ? null : await response.json();
  passed++;
  console.info(`OK ${method} ${path} → ${response.status}`);
  return value;
}
const health = await request('/health', {authorized: false});
const suffix = `${Date.now()}_${randomBytes(3).toString('hex')}`;
const credentials = {username: `qa_${suffix}`, email: `qa_${suffix}@example.com`, password: randomBytes(24).toString('base64url')};
await request('/auth/me', {authorized: false, expected: 401});
await request('/auth/register', {method: 'POST', body: credentials, expected: 201, authorized: false});
const session = await request('/auth/login', {method: 'POST', body: {email: credentials.email, password: credentials.password}, authorized: false});
token = session.access_token;
const user = await request('/auth/me');
assert.equal(user.username, credentials.username);
const socket = new WebSocket(base.replace(/^http/, 'ws') + '/ws/events');
let realtimeEvent = null;
socket.addEventListener('open', () => socket.send(JSON.stringify({token, negotiation_id: 0, after_sequence: 0})));
socket.addEventListener('message', frame => {
  const value = JSON.parse(String(frame.data));
  if (value.type === 'event' && Number.isSafeInteger(value.sequence)) realtimeEvent = value;
});
socket.addEventListener('error', () => {});
process.once('exit', () => socket.close());
await request('/auth/me', {method: 'PUT', body: {username: credentials.username + '_edit', email: credentials.email}});
const scenarioInput = {title: 'Validación de integración Angular', description: 'Escenario de prueba automatizada.',
  context: 'Renovación de un contrato de suministro.', objective: 'Acordar condiciones sostenibles.',
  counterpart_role: 'Proveedor', counterpart_goal: 'Conservar margen', counterpart_limits: 'Precio mínimo 100'};
const scenario = await request('/scenarios/', {method: 'POST', body: scenarioInput, expected: 201});
await request('/scenarios/' + scenario.id, {method: 'PUT', body: {...scenarioInput, title: scenarioInput.title + ' editado'}});
const scenarios = await request('/scenarios/?offset=0&limit=100');
assert.ok(scenarios.some(item => item.id === scenario.id));
const negotiation = await request('/negotiations/', {method: 'POST', body: {scenario_id: scenario.id}, expected: 201});
assert.equal(negotiation.status, 'active');
const input = {negotiation_id: negotiation.id, content: 'Propongo un precio de 110.', kind: 'offer', request_id: randomUUID()};
if (!health.gemini_configured) {
  await request('/messages/', {method: 'POST', body: input, expected: 503});
  await request('/messages/', {method: 'POST', body: input, expected: 503});
  const history = await request(`/messages/${negotiation.id}?offset=0&limit=500`);
  assert.equal(history.filter(item => item.request_id === input.request_id && item.sender_type === 'user').length, 1, 'Reintentar no debe duplicar mensajes.');
  console.info('OK indisponibilidad real de Gemini y reintento idempotente sin duplicados');
} else {
  console.info('Gemini configurado: esta prueba no consume turnos de IA automáticamente.');
}
await request('/negotiations/' + negotiation.id, {method: 'PATCH', body: {status: 'completed', result: 'Integración técnica comprobada sin evaluar contenido de IA.'}});
const history = await request('/negotiations/?offset=0&limit=100');
assert.ok(history.some(item => item.id === negotiation.id && item.status === 'completed'));
await request('/analyses?offset=0&limit=100');
const profile = await request('/profile');
assert.equal(typeof profile.sample_count, 'number');
await request('/recommendations');
const resources = await request('/resources/exercises');
assert.equal(resources.source, 'curated_examples');
const events = await request('/events?after=0&limit=100&negotiation_id=' + negotiation.id);
assert.ok(Array.isArray(events));
for (let attempt = 0; !realtimeEvent && attempt < 30; attempt++) await new Promise(resolve => setTimeout(resolve, 100));
assert.ok(realtimeEvent, 'El bridge WebSocket debe entregar un evento real del usuario.');
socket.close();
console.info('OK WebSocket autenticado con evento real del backend');
await request('/scenarios/' + scenario.id, {method: 'DELETE', expected: 204});
await request('/auth/password', {method: 'POST', body: {current_password: credentials.password, new_password: randomBytes(24).toString('base64url')}, expected: 204});
await request('/auth/me', {expected: 401});
console.info(`Validación terminada: ${passed} solicitudes reales comprobadas. Los datos de prueba quedan en la base local; no se modificó código del backend.`);
