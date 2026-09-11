import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ModelService, demoSession } from '../../src/application/model/service.ts';
import { SourceService } from '../../src/application/sources/service.ts';
import { InterviewReviewService } from '../../src/application/interview-review/service.ts';
import { DiagnosticService } from '../../src/application/diagnostic/service.ts';

function fixture(t: TestContext) {
  const path = join(mkdtempSync(join(tmpdir(), 'processia-diagnostic-')), 'test.sqlite');
  const models = new ModelService(path);
  const sources = new SourceService(path);
  const reviews = new InterviewReviewService(path, models, sources);
  const diagnostics = new DiagnosticService(path, models, reviews);
  t.after(() => {
    diagnostics.close();
    reviews.close();
    sources.close();
    models.close();
  });
  return { models, sources, reviews, diagnostics };
}

function addTranscript(
  sources: SourceService,
  idempotencyKey: string,
  title: string,
  content: string,
) {
  const imported = sources.add(demoSession, {
    dossier_id: 'demo-kosmio',
    idempotency_key: idempotencyKey,
    title,
    source_type: 'transcript',
    origin_context: 'Diagnostic synthétique T010',
    source_date: '2026-09-10',
    content,
  });
  const passage = sources.status(demoSession, 'demo-kosmio', imported.source_id).passages[0];
  return {
    source_id: imported.source_id,
    source_version: imported.version,
    passage_id: passage.passage_id,
  };
}

test('T010 / TC-034 à TC-037 : une opportunité traçable devient un essai ordonné sans inventer la faisabilité', (t) => {
  const { models, sources, reviews, diagnostics } = fixture(t);
  const systematic = addTranscript(
    sources,
    'diagnostic-transcript-1',
    'Entretien direction',
    'La direction valide chaque restitution avant envoi.',
  );
  const threshold = addTranscript(
    sources,
    'diagnostic-transcript-2',
    'Entretien responsable',
    'La direction intervient uniquement au-delà de 10 000 euros.',
  );
  const investigation = reviews.consolidate(demoSession, 'demo-kosmio', {
    idempotency_key: 'diagnostic-investigation-v1',
    model_id: 'process-diagnostic',
    subject: {
      kind: 'task_property',
      element_id: 'task-restitution',
      property: 'validation_rule',
      label: 'Règle de validation de la restitution',
    },
    testimonies: [systematic, threshold],
    target_role: { role_id: 'role-direction', label: 'Direction' },
  });
  const before = models.getModel(demoSession, 'demo-kosmio', 'process-diagnostic');
  const input = {
    idempotency_key: 'diagnostic-roadmap-v1',
    model_id: 'process-diagnostic',
    scope: {
      label: 'Restitution du diagnostic',
      task_ids: ['task-priorisation', 'task-restitution'],
      coverage_limit: 'Deux tâches proposées sur six sont étudiées.',
    },
    finding: {
      finding_id: 'finding-validation-divergence',
      statement: 'La règle de validation de la restitution reste divergente.',
      kind: 'declared_fact' as const,
      task_ids: ['task-restitution'],
      investigation_id: investigation.investigation_id,
    },
    opportunity: {
      opportunity_id: 'opportunity-assisted-review',
      title: 'Préparer une restitution assistée et sourcée',
      type: 'ai' as const,
      beneficiary: 'Responsable de mission',
      expected_value: {
        value: 4,
        justification: 'Réduire les oublis lors de la préparation.',
        confidence: 'to_confirm' as const,
      },
      feasibility: {
        value: null,
        justification: 'La disponibilité des règles structurées reste à vérifier.',
        confidence: 'unknown' as const,
      },
      prerequisites: [
        {
          prerequisite_id: 'prerequisite-validation-rule',
          label: 'Formaliser la règle de validation',
          status: 'missing' as const,
          impact: 'L’essai ne peut pas démarrer sans règle vérifiable.',
          completion_criterion: 'La règle est documentée et approuvée par la Direction.',
        },
      ],
      priority: {
        level: 'medium' as const,
        rationale: 'Valeur attendue forte, démarrage bloqué par une donnée manquante.',
        status: 'proposed' as const,
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
  };

  const result = diagnostics.create(demoSession, 'demo-kosmio', input);
  assert.equal(result.status, 'draft');
  assert.equal(result.version, 1);
  assert.deepEqual(result.priority_history, []);
  assert.equal(result.based_on_revision, before.revision);
  assert.deepEqual(result.scope.task_ids, input.scope.task_ids);
  assert.match(result.scope.coverage_limit, /deux tâches/i);
  assert.equal(result.findings[0].investigation_id, investigation.investigation_id);
  assert.deepEqual(result.findings[0].task_ids, ['task-restitution']);
  assert.equal(result.opportunities[0].finding_id, input.finding.finding_id);
  assert.equal(result.opportunities[0].feasibility.value, null);
  assert.equal(result.opportunities[0].feasibility.label, 'Inconnue');
  assert.equal(result.opportunities[0].score, null);
  assert.match(result.opportunities[0].score_explanation, /faisabilité inconnue/i);
  assert.equal(result.opportunities[0].prerequisites[0].status, 'missing');
  assert.match(result.opportunities[0].priority.rationale, /donnée manquante/i);
  assert.equal(result.opportunities[0].human_owner.label, 'Direction');
  assert.equal(result.opportunities[0].experiment.success_criteria.length, 2);
  assert.equal(result.opportunities[0].execution, 'not_started');
  assert.equal(result.roadmap.actions[0].kind, 'prerequisite');
  assert.deepEqual(result.roadmap.actions[0].exit_criteria, [
    'La règle est documentée et approuvée par la Direction.',
  ]);
  assert.equal(result.roadmap.actions[1].kind, 'experiment');
  assert.deepEqual(result.roadmap.actions[1].depends_on, [result.roadmap.actions[0].action_id]);
  assert.equal(result.roadmap.actions[1].effort, null);
  assert.equal(result.roadmap.actions[1].effort_label, 'À estimer');
  assert.equal(result.estimated_gain.status, 'unknown');
  assert.equal(result.estimated_gain.value, null);
  assert.deepEqual(models.getModel(demoSession, 'demo-kosmio', 'process-diagnostic'), before);

  const replay = diagnostics.create(demoSession, 'demo-kosmio', input);
  assert.equal(replay.diagnostic_id, result.diagnostic_id);
  assert.equal(diagnostics.list(demoSession, 'demo-kosmio', 'process-diagnostic').items.length, 1);

  const withHypothesis = diagnostics.defineGainHypothesis(
    demoSession,
    'demo-kosmio',
    'process-diagnostic',
    result.diagnostic_id,
    'opportunity-assisted-review',
    {
      idempotency_key: 'diagnostic-gain-hypothesis-v1',
      base_version: result.version,
      value: 30,
      unit: 'minutes par dossier',
      method: 'Estimation issue d’un atelier sur trois dossiers synthétiques.',
      estimated_at: '2026-09-01',
    },
  );
  assert.equal(withHypothesis.version, 2);
  assert.equal(withHypothesis.estimated_gain.status, 'hypothesis');
  assert.equal(withHypothesis.estimated_gain.value, 30);
  assert.equal(withHypothesis.estimated_gain.unit, 'minutes par dossier');
  assert.equal(withHypothesis.estimated_gain.author, demoSession.user_id);
  assert.deepEqual(withHypothesis.observed_gains, []);

  const withMeasurement = diagnostics.recordGainMeasurement(
    demoSession,
    'demo-kosmio',
    'process-diagnostic',
    result.diagnostic_id,
    'opportunity-assisted-review',
    {
      idempotency_key: 'diagnostic-gain-measurement-v1',
      base_version: withHypothesis.version,
      value: 24,
      unit: 'minutes par dossier',
      method: 'Moyenne chronométrée sur trois dossiers synthétiques.',
      measured_at: '2026-09-10',
    },
  );
  assert.equal(withMeasurement.version, 3);
  assert.deepEqual(withMeasurement.estimated_gain, withHypothesis.estimated_gain);
  assert.equal(withMeasurement.observed_gains.length, 1);
  assert.equal(withMeasurement.observed_gains[0].value, 24);
  assert.equal(
    withMeasurement.observed_gains[0].method,
    'Moyenne chronométrée sur trois dossiers synthétiques.',
  );
  assert.equal(withMeasurement.observed_gains[0].author, demoSession.user_id);
  assert.equal(Number.isNaN(Date.parse(withMeasurement.observed_gains[0].measured_at)), false);
  const measurementReplay = diagnostics.recordGainMeasurement(
    demoSession,
    'demo-kosmio',
    'process-diagnostic',
    result.diagnostic_id,
    'opportunity-assisted-review',
    {
      idempotency_key: 'diagnostic-gain-measurement-v1',
      base_version: withHypothesis.version,
      value: 24,
      unit: 'minutes par dossier',
      method: 'Moyenne chronométrée sur trois dossiers synthétiques.',
      measured_at: '2026-09-10',
    },
  );
  assert.equal(
    measurementReplay.observed_gains[0].measurement_id,
    withMeasurement.observed_gains[0].measurement_id,
  );
  assert.throws(
    () =>
      diagnostics.recordGainMeasurement(
        demoSession,
        'demo-kosmio',
        'process-diagnostic',
        result.diagnostic_id,
        'opportunity-assisted-review',
        {
          idempotency_key: 'diagnostic-gain-measurement-invalid-unit',
          base_version: withMeasurement.version,
          value: 0.4,
          unit: 'heures par dossier',
          method: 'Conversion non autorisée sans méthode commune.',
          measured_at: '2026-09-10',
        },
      ),
    /même unité/i,
  );
  assert.equal(
    diagnostics.list(demoSession, 'demo-kosmio', 'process-diagnostic').items[0].version,
    withMeasurement.version,
  );

  const revised = diagnostics.revisePriority(
    demoSession,
    'demo-kosmio',
    'process-diagnostic',
    result.diagnostic_id,
    'opportunity-assisted-review',
    {
      idempotency_key: 'diagnostic-priority-high-v1',
      base_version: withMeasurement.version,
      level: 'high',
      justification: 'La Direction souhaite préparer cet essai dès que le prérequis est levé.',
    },
  );
  assert.equal(revised.version, 4);
  assert.equal(revised.opportunities[0].priority.level, 'high');
  assert.equal(revised.opportunities[0].priority.status, 'manual');
  assert.equal(revised.priority_history.length, 1);
  assert.equal(revised.priority_history[0].previous.level, 'medium');
  assert.equal(revised.priority_history[0].next.level, 'high');
  assert.equal(revised.priority_history[0].actor, demoSession.user_id);
  assert.match(revised.priority_history[0].justification, /Direction souhaite/i);
  assert.equal(Number.isNaN(Date.parse(revised.priority_history[0].changed_at)), false);

  const revisedReplay = diagnostics.revisePriority(
    demoSession,
    'demo-kosmio',
    'process-diagnostic',
    result.diagnostic_id,
    'opportunity-assisted-review',
    {
      idempotency_key: 'diagnostic-priority-high-v1',
      base_version: withMeasurement.version,
      level: 'high',
      justification: 'La Direction souhaite préparer cet essai dès que le prérequis est levé.',
    },
  );
  assert.deepEqual(revisedReplay, revised);
  assert.throws(
    () =>
      diagnostics.revisePriority(
        demoSession,
        'demo-kosmio',
        'process-diagnostic',
        result.diagnostic_id,
        'opportunity-assisted-review',
        {
          idempotency_key: 'diagnostic-priority-low-stale',
          base_version: result.version,
          level: 'low',
          justification: 'Une autre lecture propose de différer cet essai.',
        },
      ),
    /diagnostic a changé/i,
  );
  const outsider = { user_id: 'outsider', application_role: 'consultant' as const, grants: [] };
  assert.throws(
    () =>
      diagnostics.recordGainMeasurement(
        outsider,
        'demo-kosmio',
        'process-diagnostic',
        result.diagnostic_id,
        'opportunity-assisted-review',
        {
          idempotency_key: 'diagnostic-gain-measurement-outsider',
          base_version: revised.version,
          value: 22,
          unit: 'minutes par dossier',
          method: 'Tentative hors du dossier privé.',
          measured_at: '2026-09-11',
        },
      ),
    /ACCESS_DENIED/,
  );
  assert.throws(
    () =>
      diagnostics.revisePriority(
        outsider,
        'demo-kosmio',
        'process-diagnostic',
        result.diagnostic_id,
        'opportunity-assisted-review',
        {
          idempotency_key: 'diagnostic-priority-outsider',
          base_version: revised.version,
          level: 'low',
          justification: 'Tentative hors du dossier privé.',
        },
      ),
    /ACCESS_DENIED/,
  );
});

test('T010 / C-05 : les droits privés sont appliqués avant la génération', (t) => {
  const { diagnostics } = fixture(t);
  const outsider = { user_id: 'outsider', application_role: 'consultant' as const, grants: [] };
  assert.throws(
    () => diagnostics.list(outsider, 'demo-kosmio', 'process-diagnostic'),
    /ACCESS_DENIED/,
  );
});
