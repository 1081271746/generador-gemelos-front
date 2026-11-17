import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generateConfig } from './runtime-config.mjs';

await generateConfig();

const port = process.env.PORT || '4200';

const args = [
  'serve',
  '--host',
  '0.0.0.0',
  '--port',
  port,
  '--serve-path',
  process.env.BASE_PATH || '/',
  '--allowed-hosts',
  '--proxy-config',
  'proxy.conf.json',
];

const angularCli = fileURLToPath(
  new URL('../node_modules/@angular/cli/bin/ng.js', import.meta.url),
);

const child = spawn(process.execPath, [angularCli, ...args], {
  stdio: 'inherit',
  shell: false,
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('error', error => {
  console.error('Error iniciando Angular CLI:', error);
  process.exit(1);
});

child.on('exit', code => process.exit(code ?? 1));
