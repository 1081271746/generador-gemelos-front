import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Only these public connection settings are exposed to the browser.
export function resolveConfig(defaults, env = process.env) {
  const apiBaseUrl = env.API_BASE_URL ?? defaults.apiBaseUrl;
  const websocketUrl = env.WEBSOCKET_URL ?? (env.API_BASE_URL
    ? `${apiBaseUrl.replace(/\/$/, '')}/ws/events` : defaults.websocketUrl);
  for (const [name, value, protocols] of [
    ['API_BASE_URL', apiBaseUrl, ['http:', 'https:']],
    ['WEBSOCKET_URL', websocketUrl, ['http:', 'https:', 'ws:', 'wss:']],
  ]) {
    if (typeof value !== 'string' || !value.trim() || value !== value.trim()
      || value.startsWith('//') || /[\s\\]/.test(value)) {
      throw new Error(`${name}: usa una URL pública válida o una ruta que empiece por /.`);
    }
    const url = new URL(value, 'https://frontend.invalid');
    if ((!value.startsWith('/') && !/^[a-z]+:\/\//i.test(value))
      || !protocols.includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error(`${name}: no se permiten credenciales, consultas ni fragmentos.`);
    }
  }
  return {apiBaseUrl: apiBaseUrl.replace(/\/$/, '') || '/', websocketUrl};
}

export async function readConfig(path = resolve(project, 'public/config.json'), env = process.env) {
  return resolveConfig(JSON.parse(await readFile(path, 'utf8')), env);
}

export async function generateConfig() {
  const settings = await readConfig();
  const target = resolve(project, '.runtime/config.json');
  await mkdir(dirname(target), {recursive: true});
  await writeFile(target, JSON.stringify(settings, null, 2) + '\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateConfig();
}
