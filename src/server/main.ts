import { mkdirSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, extname, join } from 'node:path';
import { createAppServer } from './http.ts';
import { ModelService, demoSession } from '../application/model/service.ts';
import type { ViteDevServer } from 'vite';
import { SourceService } from '../application/sources/service.ts';
import { SharingService } from '../application/sharing/service.ts';
import { EnrichmentService } from '../application/interviews/enrichment.ts';

const requestedDatabasePath = process.env.PROCESSIA_DB_PATH ?? resolve('.local/processia.sqlite');
const ephemeralDatabase = requestedDatabasePath === ':memory:';
const databasePath = ephemeralDatabase
  ? join(tmpdir(), `processia-${process.pid}.sqlite`)
  : requestedDatabasePath;
mkdirSync(dirname(databasePath), { recursive: true });
const service = new ModelService(databasePath);
const sources = new SourceService(databasePath);
const sharing = new SharingService(databasePath);
const enrichments = new EnrichmentService(databasePath, service, sources);
sources.add(demoSession, {
  dossier_id: 'demo-kosmio',
  idempotency_key: 'demo-source-cadrage-v1',
  title: 'Note de cadrage synthétique',
  source_type: 'text',
  origin_context: 'Démonstration locale ProcessIA',
  source_date: null,
  content:
    'REPERE-PRIVE-DEMO. Une revue des recommandations est réalisée avant la restitution.\n\nCette note synthétique reste dans la préparation du consultant.',
});
let vite: ViteDevServer | undefined;
const production = process.env.NODE_ENV === 'production';
const dist = resolve('dist');
if (production && !existsSync(resolve(dist, 'index.html')))
  throw new Error('Lancez npm run build avant npm start.');
const server = createAppServer(
  service,
  (req, res) => {
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
  },
  demoSession,
  { sources, sharing, enrichments },
);
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
    enrichments.close();
    sharing.close();
    sources.close();
    service.close();
    if (ephemeralDatabase) {
      rmSync(databasePath, { force: true });
      rmSync(`${databasePath}-shm`, { force: true });
      rmSync(`${databasePath}-wal`, { force: true });
    }
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
