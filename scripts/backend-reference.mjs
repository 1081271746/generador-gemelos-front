// Starts existing backend source unchanged, solely for this workspace's frontend preview.
// For a standalone installation, start your existing backend normally instead.
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {access, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';

const backend = resolve(process.argv[2] || '../../.local/backend-reference');
const runtime = resolve('../../.local/reference-runtime');
const dependencies = resolve('../../.local/conversation-workspace/files/.pythonlibs/lib/python3.13/site-packages');
const websocketDependencies = resolve('../../.pythonlibs/lib/python3.13/site-packages');
await access(resolve(backend, 'app/main.py'));
await mkdir(runtime, {recursive: true});
const env = {
  ...process.env,
  PYTHONPATH: `${backend}:${websocketDependencies}:${dependencies}`,
  PYTHONDONTWRITEBYTECODE: '1',
  DATABASE_URL: `sqlite:///${runtime}/negotiation.db`,
  SECRET_KEY: randomBytes(48).toString('base64url'),
  SERVICE_SECRET: randomBytes(48).toString('base64url'),
  CORS_ORIGINS: ['http://localhost:4200', process.env.REPLIT_DEV_DOMAIN && `https://${process.env.REPLIT_DEV_DOMAIN}`].filter(Boolean).join(','),
  REDIS_URL: 'redis://127.0.0.1:6379/0',
};
const children = [];
function launch(command, args) {
  const child = spawn(command, args, {cwd: backend, env, stdio: 'inherit'});
  child.on('error', () => { console.error(`No se pudo iniciar ${command}.`); shutdown(1); });
  children.push(child);
  return child;
}
function shutdown(code = 0) {
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => process.exit(code), 250).unref();
}
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => shutdown());
const migration = launch('python3', ['-m', 'alembic', 'upgrade', 'head']);
await new Promise((resolveDone, reject) => migration.once('exit', code => code === 0 ? resolveDone() : reject(new Error('Falló la preparación de la base de desarrollo.'))));
launch('redis-server', ['--bind', '127.0.0.1', '--port', '6379', '--save', '', '--appendonly', 'no', '--dir', runtime]);
launch('python3', ['-m', 'app.rpc.ai_server', 'twin']);
launch('python3', ['-m', 'app.rpc.ai_server', 'analysis']);
launch('python3', ['-m', 'app.rpc.event_server']);
const api = launch('python3', ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000']);
api.once('exit', code => shutdown(code ?? 1));
console.info('Backend existente iniciado sin modificar su código. Sin credencial Gemini, los turnos de IA devuelven indisponibilidad real.');
