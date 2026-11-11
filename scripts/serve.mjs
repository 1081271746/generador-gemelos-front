import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('dist/negotiation-front/browser');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
    const candidate = resolve(root, '.' + pathname);
    if (candidate !== root && !candidate.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    let file = candidate;
    try { if (!(await stat(file)).isFile()) file = resolve(root, 'index.html'); }
    catch { file = extname(pathname) ? candidate : resolve(root, 'index.html'); }
    const content = await readFile(file);
    response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', file.endsWith('config.json') || file.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600');
    response.end(content);
  } catch { response.writeHead(404).end('No encontrado'); }
}).listen(Number(process.env.PORT || 4200), '0.0.0.0');
