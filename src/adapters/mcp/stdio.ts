import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { ModelService, demoSession } from '../../application/model/service.ts';
import { SourceService } from '../../application/sources/service.ts';
import { createProcessIAMcpServer } from './server.ts';

const databasePath = process.env.PROCESSIA_DB_PATH ?? resolve('.local/processia.sqlite');
if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });

const bootstrap = new ModelService(databasePath);
bootstrap.close();
const sources = new SourceService(databasePath);

serveStdio(() => createProcessIAMcpServer(sources, demoSession), {
  onerror: (error) => console.error('Erreur MCP ProcessIA:', error.message),
});

async function shutdown() {
  sources.close();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
