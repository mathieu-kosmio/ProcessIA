import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ModelService, demoSession } from '../../src/application/model/service.ts';
import { SourceService } from '../../src/application/sources/service.ts';
import { InterviewReviewService } from '../../src/application/interview-review/service.ts';

function fixture(t: TestContext) {
  const path = join(mkdtempSync(join(tmpdir(), 'processia-review-')), 'test.sqlite');
  const models = new ModelService(path);
  const sources = new SourceService(path);
  const reviews = new InterviewReviewService(path, models, sources);
  t.after(() => {
    reviews.close();
    sources.close();
    models.close();
  });
  return { models, sources, reviews };
}

function addTranscript(
  sources: SourceService,
  idempotencyKey: string,
  title: string,
  sourceDate: string,
  content: string,
) {
  const imported = sources.add(demoSession, {
    dossier_id: 'demo-kosmio',
    idempotency_key: idempotencyKey,
    title,
    source_type: 'transcript',
    origin_context: 'Entretien complémentaire synthétique',
    source_date: sourceDate,
    content,
  });
  const passage = sources.status(demoSession, 'demo-kosmio', imported.source_id).passages[0];
  return {
    source_id: imported.source_id,
    source_version: imported.version,
    passage_id: passage.passage_id,
  };
}

test('T009 / TC-032 : trois témoignages conservent une divergence sans vote majoritaire', (t) => {
  const { sources, reviews } = fixture(t);
  const systematic = addTranscript(
    sources,
    'transcript-direction-1',
    'Entretien direction 1',
    '2026-09-02',
    'La direction valide chaque restitution avant envoi.',
  );
  const threshold = addTranscript(
    sources,
    'transcript-direction-2',
    'Entretien direction 2',
    '2026-09-05',
    'La direction intervient uniquement lorsque le montant dépasse 10 000 euros.',
  );
  const repeated = addTranscript(
    sources,
    'transcript-direction-3',
    'Entretien direction 3',
    '2026-09-07',
    'La direction valide chaque restitution avant envoi.',
  );
  const input = {
    idempotency_key: 'review-validation-rule-v1',
    model_id: 'process-diagnostic',
    subject: {
      kind: 'task_property' as const,
      element_id: 'task-restitution',
      property: 'validation_rule',
      label: 'Règle de validation de la restitution',
    },
    testimonies: [systematic, threshold, repeated],
    target_role: { role_id: 'role-direction', label: 'Direction' },
  };

  const result = reviews.consolidate(demoSession, 'demo-kosmio', input);
  assert.equal(result.kind, 'divergence');
  assert.equal(result.status, 'open');
  assert.equal(result.resolution, null);
  assert.equal(result.assertions.length, 3);
  assert.deepEqual(
    result.assertions.map((assertion) => assertion.value),
    [
      'La direction valide chaque restitution avant envoi.',
      'La direction intervient uniquement lorsque le montant dépasse 10 000 euros.',
      'La direction valide chaque restitution avant envoi.',
    ],
  );
  assert.deepEqual(
    result.assertions.map((assertion) => assertion.provenance.source_date),
    ['2026-09-02', '2026-09-05', '2026-09-07'],
  );
  assert.equal(result.clarification.target_role.label, 'Direction');
  assert.equal(result.clarification.target_person, null);
  assert.match(result.clarification.question, /dans quelles conditions/i);
  assert.equal('winning_assertion_id' in result, false);

  const replay = reviews.consolidate(demoSession, 'demo-kosmio', input);
  assert.equal(replay.investigation_id, result.investigation_id);
  assert.equal(reviews.list(demoSession, 'demo-kosmio', 'process-diagnostic').items.length, 1);
});

test('T009 / FR-032 : une référence inaccessible bloque avant toute consolidation', (t) => {
  const { sources, reviews } = fixture(t);
  const testimony = addTranscript(
    sources,
    'private-transcript',
    'Entretien privé',
    '2026-09-08',
    'La validation dépend du montant.',
  );
  const outsider = { user_id: 'outsider', application_role: 'consultant' as const, grants: [] };
  assert.throws(
    () =>
      reviews.consolidate(outsider, 'demo-kosmio', {
        idempotency_key: 'forbidden-review',
        model_id: 'process-diagnostic',
        subject: {
          kind: 'task_property',
          element_id: 'task-restitution',
          property: 'validation_rule',
          label: 'Règle de validation',
        },
        testimonies: [testimony],
        target_role: { role_id: 'role-direction', label: 'Direction' },
      }),
    /ACCESS_DENIED/,
  );
  assert.equal(reviews.list(demoSession, 'demo-kosmio', 'process-diagnostic').items.length, 0);
});

test('T009 / FR-032 : une propriété doit cibler une tâche ou un flux existant', (t) => {
  const { sources, reviews } = fixture(t);
  const first = addTranscript(
    sources,
    'target-transcript-1',
    'Entretien cible 1',
    '2026-09-08',
    'Le dossier part dès validation.',
  );
  const second = addTranscript(
    sources,
    'target-transcript-2',
    'Entretien cible 2',
    '2026-09-09',
    'Le dossier part le lendemain de la validation.',
  );

  assert.throws(
    () =>
      reviews.consolidate(demoSession, 'demo-kosmio', {
        idempotency_key: 'missing-flow-review',
        model_id: 'process-diagnostic',
        subject: {
          kind: 'flow_property',
          element_id: 'flow-absent',
          property: 'dispatch_timing',
          label: 'Moment de transmission',
        },
        testimonies: [first, second],
        target_role: { role_id: 'role-direction', label: 'Direction' },
      }),
    /indisponible/,
  );
  assert.equal(reviews.list(demoSession, 'demo-kosmio', 'process-diagnostic').items.length, 0);
});
