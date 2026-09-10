import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { createAppServer } from './http.ts';
import { ModelService } from '../application/model/service.ts';
import type { ViteDevServer } from 'vite';

const databasePath = process.env.PROCESSIA_DB_PATH ?? resolve('.local/processia.sqlite');
if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
const service = new ModelService(databasePath);
let vite: ViteDevServer | undefined;
const production = process.env.NODE_ENV === 'production';
const dist = resolve('dist');
if (production && !existsSync(resolve(dist, 'index.html')))
  throw new Error('Lancez npm run build avant npm start.');
const server = createAppServer(service, (req, res) => {
  if (vite) {
    vite.middlewares(req, res);
    return;
  }
  if (!['GET', 'HEAD'].includes(req.method ?? '')) {
    res.writeHead(405);
    res.end();
    return;
  }
  const path = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
  const file = path === '/' ? resolve(dist, 'index.html') : resolve(dist, `.${path}`);
  if (!file.startsWith(`${dist}/`) || !existsSync(file)) {
    res.writeHead(404);
    res.end();
    return;
  }
  const mime: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
  };
  res.writeHead(200, {
    'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  res.end(req.method === 'HEAD' ? undefined : readFileSync(file));
});
if (!production) {
  const { createServer } = await import('vite');
  vite = await createServer({ server: { middlewareMode: true, ws: { server } }, appType: 'spa' });
}
const port = Number(process.env.PORT ?? 3100);
server.listen(port, '127.0.0.1', () =>
  console.log(`ProcessIA : http://127.0.0.1:${port} (démonstration synthétique locale)`),
);
async function shutdown() {
  await vite?.close();
  server.close(() => {
    service.close();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
