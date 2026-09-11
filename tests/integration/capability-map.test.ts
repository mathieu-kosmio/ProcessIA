import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { ModelService, demoSession } from '../../src/application/model/service.ts';
import { SourceService } from '../../src/application/sources/service.ts';
import { InterviewReviewService } from '../../src/application/interview-review/service.ts';
import { DiagnosticService } from '../../src/application/diagnostic/service.ts';
import { CapabilityService } from '../../src/application/diagnostic/capability-service.ts';
import { createAppServer } from '../../src/server/http.ts';

function fixture(t: TestContext) {
  const path = join(mkdtempSync(join(tmpdir(), 'processia-capability-')), 'test.sqlite');
  const models = new ModelService(path);
  const sources = new SourceService(path);
  const reviews = new InterviewReviewService(path, models, sources);
  const diagnostics = new DiagnosticService(path, models, reviews);
  const capabilities = new CapabilityService(path, models, diagnostics);
  t.after(() => {
    capabilities.close();
    diagnostics.close();
    reviews.close();
    sources.close();
    models.close();
  });
  return { models, sources, reviews, diagnostics, capabilities };
}

function createDiagnostic(t: TestContext) {
  const services = fixture(t);
  const testimonies = [
    ['capability-source-1', 'La direction valide chaque devis avant envoi.'],
    ['capability-source-2', 'Le responsable contrôle seulement les devis complexes.'],
  ].map(([idempotencyKey, content]) => {
    const source = services.sources.add(demoSession, {
      dossier_id: 'demo-kosmio',
      idempotency_key: idempotencyKey,
      title: idempotencyKey,
      source_type: 'transcript' as const,
      origin_context: 'Architecture de capacités synthétique',
      source_date: '2026-09-11',
      content,
    });
    const passage = services.sources.status(demoSession, 'demo-kosmio', source.source_id)
      .passages[0];
    return {
      source_id: source.source_id,
      source_version: source.version,
      passage_id: passage.passage_id,
    };
  });
  const investigation = services.reviews.consolidate(demoSession, 'demo-kosmio', {
    idempotency_key: 'capability-investigation-v1',
    model_id: 'process-diagnostic',
    subject: {
      kind: 'task_property',
      element_id: 'task-restitution',
      property: 'validation_rule',
      label: 'Règle de validation des devis',
    },
    testimonies,
    target_role: { role_id: 'role-direction', label: 'Direction' },
  });
  const diagnostic = services.diagnostics.create(demoSession, 'demo-kosmio', {
    idempotency_key: 'capability-diagnostic-v1',
    model_id: 'process-diagnostic',
    scope: {
      label: 'Préparation et restitution',
      task_ids: ['task-preparation', 'task-restitution'],
      coverage_limit: 'Deux tâches synthétiques sont étudiées.',
    },
    finding: {
      finding_id: 'finding-quote-validation',
      statement: 'Les règles de validation des devis restent divergentes.',
      kind: 'declared_fact',
      task_ids: ['task-restitution'],
      investigation_id: investigation.investigation_id,
    },
    opportunity: {
      opportunity_id: 'opportunity-document-extraction',
      title: 'Extraire les informations utiles des devis',
      type: 'ai',
      beneficiary: 'Responsable de mission',
      expected_value: {
        value: 4,
        justification: 'Réduire les ressaisies.',
        confidence: 'to_confirm',
      },
      feasibility: {
        value: null,
        justification: 'Les formats restent à inventorier.',
        confidence: 'unknown',
      },
      prerequisites: [],
      priority: {
        level: 'medium',
        rationale: 'Valeur probable, faisabilité inconnue.',
        status: 'proposed',
      },
      human_owner: { role_id: 'role-direction', label: 'Direction' },
      experiment: {
        hypothesis: 'Une extraction contrôlée réduit la ressaisie.',
        protocol: 'Tester sur des devis synthétiques.',
        success_criteria: ['Les champs extraits sont validés humainement.'],
      },
    },
  });
  return { ...services, diagnostic };
}

test('T010 / AC-036-1 : une capacité relie deux usages sans mutualiser leurs accès', (t) => {
  const { capabilities, diagnostic } = createDiagnostic(t);
  const input = {
    idempotency_key: 'capability-quote-extraction-v1',
    model_id: 'process-diagnostic',
    diagnostic_id: diagnostic.diagnostic_id,
    capability_id: 'capability-quote-extraction',
    label: 'Extraction structurée de devis',
    description: 'Extraire des champs proposés, puis demander une validation humaine.',
    provider: null,
    execution: 'disabled' as const,
    usage_bindings: [
      {
        usage_id: 'usage-prepare-quote',
        label: 'Préparer un devis reçu',
        context: 'Identifier les références utiles pendant la préparation du dossier.',
        task_ids: ['task-preparation'],
        required_scope: 'private' as const,
      },
      {
        usage_id: 'usage-review-quote',
        label: 'Contrôler le devis avant restitution',
        context: 'Comparer les champs proposés aux règles partagées et validées.',
        task_ids: ['task-restitution'],
        required_scope: 'shared' as const,
      },
    ],
  };

  const result = capabilities.create(demoSession, 'demo-kosmio', input);
  assert.equal(result.based_on_diagnostic_version, diagnostic.version);
  assert.equal(result.provider, null);
  assert.equal(result.execution, 'disabled');
  assert.equal(result.usage_bindings.length, 2);
  assert.deepEqual(
    result.usage_bindings.map((binding) => binding.required_scope),
    ['private', 'shared'],
  );
  assert.equal('required_scope' in result, false);

  const replay = capabilities.create(demoSession, 'demo-kosmio', input);
  assert.equal(replay.capability_map_id, result.capability_map_id);
  assert.equal(capabilities.list(demoSession, 'demo-kosmio', 'process-diagnostic').items.length, 1);

  const outsider = { user_id: 'outsider', application_role: 'consultant' as const, grants: [] };
  assert.throws(
    () => capabilities.list(outsider, 'demo-kosmio', 'process-diagnostic'),
    /ACCESS_DENIED/,
  );
  assert.throws(
    () =>
      capabilities.create(demoSession, 'demo-kosmio', {
        ...input,
        idempotency_key: 'capability-invalid-task',
        capability_id: 'capability-invalid',
        usage_bindings: [
          ...input.usage_bindings,
          {
            ...input.usage_bindings[0],
            usage_id: 'usage-invalid',
            task_ids: ['task-absente'],
          },
        ],
      }),
    /tâches existantes/i,
  );
  assert.equal(capabilities.list(demoSession, 'demo-kosmio', 'process-diagnostic').items.length, 1);
});

test('T010 / HTTP : créer puis relire une architecture de capacité privée', async (t) => {
  const { models, reviews, diagnostics, capabilities, diagnostic } = createDiagnostic(t);
  const server = createAppServer(models, undefined, demoSession, {
    reviews,
    diagnostics,
    capabilityMaps: capabilities,
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const route = `${base}/api/dossiers/demo-kosmio/models/process-diagnostic/capabilities`;
  const payload = {
    idempotency_key: 'capability-http-v1',
    diagnostic_id: diagnostic.diagnostic_id,
    capability_id: 'capability-quote-extraction',
    label: 'Extraction structurée de devis',
    description: 'Extraire des champs proposés, puis demander une validation humaine.',
    provider: null,
    execution: 'disabled',
    usage_bindings: [
      {
        usage_id: 'usage-prepare-quote',
        label: 'Préparer un devis reçu',
        context: 'Identifier les références utiles pendant la préparation du dossier.',
        task_ids: ['task-preparation'],
        required_scope: 'private',
      },
      {
        usage_id: 'usage-review-quote',
        label: 'Contrôler le devis avant restitution',
        context: 'Comparer les champs proposés aux règles partagées et validées.',
        task_ids: ['task-restitution'],
        required_scope: 'shared',
      },
    ],
  };

  const createdResponse = await fetch(route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify(payload),
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.equal(created.usage_bindings.length, 2);
  assert.equal(created.execution, 'disabled');

  const listResponse = await fetch(route);
  assert.equal(listResponse.status, 200);
  assert.equal((await listResponse.json()).items[0].capability_map_id, created.capability_map_id);

  const malformed = await fetch(route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ ...payload, created_by: 'admin' }),
  });
  assert.equal(malformed.status, 400);
});
