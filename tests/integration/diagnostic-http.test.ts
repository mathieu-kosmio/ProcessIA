import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ModelService, demoSession } from '../../src/application/model/service.ts';
import { SourceService } from '../../src/application/sources/service.ts';
import { InterviewReviewService } from '../../src/application/interview-review/service.ts';
import { DiagnosticService } from '../../src/application/diagnostic/service.ts';
import { createAppServer } from '../../src/server/http.ts';

test('T010 / HTTP : générer puis relire un diagnostic et sa feuille de route', async (t) => {
  const path = join(mkdtempSync(join(tmpdir(), 'processia-diagnostic-http-')), 'test.sqlite');
  const models = new ModelService(path);
  const sources = new SourceService(path);
  const reviews = new InterviewReviewService(path, models, sources);
  const diagnostics = new DiagnosticService(path, models, reviews);
  const server = createAppServer(models, undefined, demoSession, { reviews, diagnostics });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    diagnostics.close();
    reviews.close();
    sources.close();
    models.close();
  });
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const testimonies = [
    ['diagnostic-http-source-1', 'Validation systématique avant envoi.'],
    ['diagnostic-http-source-2', 'Validation uniquement au-delà du seuil.'],
  ].map(([key, content]) => {
    const source = sources.add(demoSession, {
      dossier_id: 'demo-kosmio',
      idempotency_key: key,
      title: key,
      source_type: 'transcript',
      origin_context: 'Test HTTP T010',
      source_date: '2026-09-10',
      content,
    });
    const passage = sources.status(demoSession, 'demo-kosmio', source.source_id).passages[0];
    return {
      source_id: source.source_id,
      source_version: source.version,
      passage_id: passage.passage_id,
    };
  });
  const investigation = reviews.consolidate(demoSession, 'demo-kosmio', {
    idempotency_key: 'diagnostic-http-investigation',
    model_id: 'process-diagnostic',
    subject: {
      kind: 'task_property',
      element_id: 'task-restitution',
      property: 'validation_rule',
      label: 'Règle de validation',
    },
    testimonies,
    target_role: { role_id: 'role-direction', label: 'Direction' },
  });
  const payload = {
    idempotency_key: 'diagnostic-http-v1',
    scope: {
      label: 'Restitution du diagnostic',
      task_ids: ['task-priorisation', 'task-restitution'],
      coverage_limit: 'Deux tâches proposées sur six sont étudiées.',
    },
    finding: {
      finding_id: 'finding-validation-divergence',
      statement: 'La règle de validation reste divergente.',
      kind: 'declared_fact',
      task_ids: ['task-restitution'],
      investigation_id: investigation.investigation_id,
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
        justification: 'La disponibilité des règles reste à vérifier.',
        confidence: 'unknown',
      },
      prerequisites: [
        {
          prerequisite_id: 'prerequisite-validation-rule',
          label: 'Formaliser la règle de validation',
          status: 'missing',
          impact: 'L’essai attend une règle vérifiable.',
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
        hypothesis: 'Une préparation sourcée réduit les oublis.',
        protocol: 'Tester sur trois dossiers synthétiques ou autorisés.',
        success_criteria: ['Chaque proposition cite son origine.'],
      },
    },
  };
  const route = `${base}/api/dossiers/demo-kosmio/models/process-diagnostic/diagnostics`;

  const response = await fetch(route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify(payload),
  });
  assert.equal(response.status, 201);
  const diagnostic = await response.json();
  assert.equal(diagnostic.opportunities[0].feasibility.label, 'Inconnue');
  assert.equal(diagnostic.roadmap.actions.length, 2);

  const list = await fetch(route);
  assert.equal(list.status, 200);
  assert.equal((await list.json()).items[0].diagnostic_id, diagnostic.diagnostic_id);

  const opportunityRoute = `${route}/${diagnostic.diagnostic_id}/opportunities/opportunity-assisted-review`;
  const hypothesisResponse = await fetch(`${opportunityRoute}/gain-hypothesis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({
      idempotency_key: 'diagnostic-http-gain-hypothesis-v1',
      base_version: 1,
      value: 30,
      unit: 'minutes par dossier',
      method: 'Estimation issue d’un atelier sur trois dossiers synthétiques.',
      estimated_at: '2026-09-01',
    }),
  });
  assert.equal(hypothesisResponse.status, 200);
  const withHypothesis = await hypothesisResponse.json();
  assert.equal(withHypothesis.estimated_gain.status, 'hypothesis');
  assert.equal(withHypothesis.estimated_gain.author, demoSession.user_id);

  const measurementResponse = await fetch(`${opportunityRoute}/gain-measurements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({
      idempotency_key: 'diagnostic-http-gain-measurement-v1',
      base_version: 2,
      value: 24,
      unit: 'minutes par dossier',
      method: 'Moyenne chronométrée sur trois dossiers synthétiques.',
      measured_at: '2026-09-10',
    }),
  });
  assert.equal(measurementResponse.status, 200);
  const withMeasurement = await measurementResponse.json();
  assert.equal(withMeasurement.estimated_gain.value, 30);
  assert.equal(withMeasurement.observed_gains[0].value, 24);
  assert.equal(withMeasurement.observed_gains[0].author, demoSession.user_id);

  const malformedMeasurement = await fetch(`${opportunityRoute}/gain-measurements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({
      idempotency_key: 'diagnostic-http-gain-measurement-invalid',
      base_version: 3,
      value: 22,
      unit: 'minutes par dossier',
      method: 'Mesure externe non autorisée.',
      measured_at: '2026-09-11',
      author: 'admin',
    }),
  });
  assert.equal(malformedMeasurement.status, 400);

  const autonomyResponse = await fetch(`${opportunityRoute}/autonomy-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({
      idempotency_key: 'diagnostic-http-autonomy-v1',
      base_version: 3,
      title: 'S’entraîner à valider une restitution assistée',
      objective: 'Rendre la Direction autonome dans la validation des propositions.',
      target_role: { role_id: 'role-direction', label: 'Direction' },
      resource: {
        kind: 'exercise',
        title: 'Exercice guidé : relire un dossier synthétique',
        description: 'Identifier une source, corriger une proposition et motiver la validation.',
      },
      completion_criterion:
        'La Direction valide seule trois propositions sourcées et motive chaque correction.',
    }),
  });
  assert.equal(autonomyResponse.status, 200);
  const withAutonomy = await autonomyResponse.json();
  assert.equal(withAutonomy.version, 4);
  assert.equal(withAutonomy.roadmap.actions.at(-1).kind, 'autonomy');
  assert.equal(withAutonomy.roadmap.actions.at(-1).autonomy.prepared_by, demoSession.user_id);

  const malformedAutonomy = await fetch(`${opportunityRoute}/autonomy-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({
      idempotency_key: 'diagnostic-http-autonomy-invalid',
      base_version: 4,
      title: 'Action imposée',
      objective: 'Objectif externe.',
      target_role: { role_id: 'role-direction', label: 'Direction' },
      resource: {
        kind: 'exercise',
        title: 'Exercice externe',
        description: 'Charge non autorisée.',
      },
      completion_criterion: 'Critère externe.',
      prepared_by: 'admin',
    }),
  });
  assert.equal(malformedAutonomy.status, 400);

  const priorityRoute = `${route}/${diagnostic.diagnostic_id}/opportunities/opportunity-assisted-review/priority`;
  const priorityResponse = await fetch(priorityRoute, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({
      idempotency_key: 'diagnostic-http-priority-high-v1',
      base_version: 4,
      level: 'high',
      justification: 'La Direction souhaite préparer cet essai dès la levée du prérequis.',
    }),
  });
  assert.equal(priorityResponse.status, 200);
  const revised = await priorityResponse.json();
  assert.equal(revised.version, 5);
  assert.equal(revised.opportunities[0].priority.status, 'manual');
  assert.equal(revised.priority_history[0].actor, demoSession.user_id);

  const malformedPriority = await fetch(priorityRoute, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({
      idempotency_key: 'diagnostic-http-priority-invalid',
      base_version: 5,
      level: 'low',
      justification: 'Décision externe non autorisée.',
      actor: 'admin',
    }),
  });
  assert.equal(malformedPriority.status, 400);

  const malformed = await fetch(route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ ...payload, user_id: 'admin' }),
  });
  assert.equal(malformed.status, 400);
});
