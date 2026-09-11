import { mkdirSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, extname, join } from 'node:path';
import { createAppServer } from './http.ts';
import { ModelService, demoSession } from '../application/model/service.ts';
import type { ViteDevServer } from 'vite';
import { SourceService } from '../application/sources/service.ts';
import { SharingService } from '../application/sharing/service.ts';
import { EnrichmentService } from '../application/interviews/enrichment.ts';
import { InterviewService } from '../application/interviews/session.ts';
import { BpmnService } from '../adapters/bpmn/service.ts';
import { InterviewReviewService } from '../application/interview-review/service.ts';
import { DiagnosticService } from '../application/diagnostic/service.ts';

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
const interviews = new InterviewService(databasePath, service);
const bpmn = new BpmnService(databasePath, service);
const reviews = new InterviewReviewService(databasePath, service, sources);
const diagnostics = new DiagnosticService(databasePath, service, reviews);
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
const demoTestimonyA = sources.add(demoSession, {
  dossier_id: 'demo-kosmio',
  idempotency_key: 'demo-transcript-validation-systematic-v1',
  title: 'Entretien Direction',
  source_type: 'transcript',
  origin_context: 'Démonstration locale ProcessIA',
  source_date: '2026-09-02',
  content: 'La direction valide chaque restitution avant envoi.',
});
const demoTestimonyB = sources.add(demoSession, {
  dossier_id: 'demo-kosmio',
  idempotency_key: 'demo-transcript-validation-threshold-v1',
  title: 'Entretien Responsable de mission',
  source_type: 'transcript',
  origin_context: 'Démonstration locale ProcessIA',
  source_date: '2026-09-05',
  content: 'La direction intervient uniquement au-delà de 10 000 euros.',
});
const demoPassageA = sources.status(demoSession, 'demo-kosmio', demoTestimonyA.source_id)
  .passages[0];
const demoPassageB = sources.status(demoSession, 'demo-kosmio', demoTestimonyB.source_id)
  .passages[0];
const demoInvestigation = reviews.consolidate(demoSession, 'demo-kosmio', {
  idempotency_key: 'demo-review-validation-rule-v1',
  model_id: 'process-diagnostic',
  subject: {
    kind: 'task_property',
    element_id: 'task-restitution',
    property: 'validation_rule',
    label: 'Règle de validation de la restitution',
  },
  testimonies: [
    {
      source_id: demoTestimonyA.source_id,
      source_version: demoTestimonyA.version,
      passage_id: demoPassageA.passage_id,
    },
    {
      source_id: demoTestimonyB.source_id,
      source_version: demoTestimonyB.version,
      passage_id: demoPassageB.passage_id,
    },
  ],
  target_role: { role_id: 'role-direction', label: 'Direction' },
});
diagnostics.create(demoSession, 'demo-kosmio', {
  idempotency_key: 'demo-diagnostic-roadmap-v1',
  model_id: 'process-diagnostic',
  scope: {
    label: 'Restitution du diagnostic',
    task_ids: ['task-priorisation', 'task-restitution'],
    coverage_limit: 'Deux tâches proposées sur six sont étudiées dans cette démonstration.',
  },
  finding: {
    finding_id: 'finding-validation-divergence',
    statement: 'La règle de validation de la restitution reste divergente.',
    kind: 'confirmed_fact',
    task_ids: ['task-restitution'],
    investigation_id: demoInvestigation.investigation_id,
  },
  opportunity: {
    opportunity_id: 'opportunity-assisted-review',
    title: 'Préparer une restitution assistée et sourcée',
    type: 'ai',
    beneficiary: 'Responsable de mission',
    expected_value: {
      value: 4,
      justification: 'Réduire les oublis lors de la préparation.',
      confidence: 'to_confirm',
    },
    feasibility: {
      value: null,
      justification: 'La disponibilité des règles structurées reste à vérifier.',
      confidence: 'unknown',
    },
    prerequisites: [
      {
        prerequisite_id: 'prerequisite-validation-rule',
        label: 'Formaliser la règle de validation',
        status: 'missing',
        impact: 'L’essai ne peut pas démarrer sans règle vérifiable.',
        completion_criterion: 'La règle est documentée et approuvée par la Direction.',
      },
    ],
    priority: {
      level: 'medium',
      rationale: 'Valeur attendue forte, démarrage bloqué par une donnée manquante.',
      status: 'proposed',
    },
    human_owner: { role_id: 'role-direction', label: 'Direction' },
    experiment: {
      hypothesis: 'Une préparation sourcée réduit les oublis sans retirer la validation humaine.',
      protocol: 'Tester sur trois dossiers synthétiques ou autorisés.',
      success_criteria: [
        'Chaque proposition cite son origine.',
        'La Direction peut corriger avant toute restitution.',
      ],
    },
  },
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
  { sources, sharing, enrichments, interviews, bpmn, reviews, diagnostics },
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
    interviews.close();
    diagnostics.close();
    reviews.close();
    bpmn.close();
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
