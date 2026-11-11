import { spawn } from 'node:child_process';

const port = process.env.PORT || '4200';
const args = ['serve', '--host', '0.0.0.0', '--port', port, '--serve-path', process.env.BASE_PATH || '/', '--allowed-hosts', '--proxy-config', 'proxy.conf.json'];
const child = spawn('ng', args, {stdio: 'inherit', shell: false});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code ?? 1));
