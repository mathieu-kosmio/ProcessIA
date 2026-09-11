import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ModelService, demoSession } from '../../src/application/model/service.ts';
import { TargetScenarioService } from '../../src/application/diagnostic/target-service.ts';

function fixture(t: TestContext) {
  const path = join(mkdtempSync(join(tmpdir(), 'processia-target-')), 'test.sqlite');
  const models = new ModelService(path);
  const targets = new TargetScenarioService(path, models);
  t.after(() => {
    targets.close();
    models.close();
  });
  return { models, targets };
}

test('T010 / TC-033 : une cible validée reste distincte du réel et signale une référence antérieure', (t) => {
  const { models, targets } = fixture(t);
  const before = models.getModel(demoSession, 'demo-kosmio', 'process-diagnostic');
  const input = {
    idempotency_key: 'target-assisted-review-v1',
    model_id: 'process-diagnostic',
    base_revision: before.revision,
    name: 'Restitution assistée',
    changes: [
      {
        change_id: 'change-restitution-work',
        type: 'update_task_label' as const,
        task_id: 'task-restitution',
        before_label: 'Restituer le diagnostic',
        after_label: 'Préparer et valider la restitution assistée',
        prepared_by: 'ai' as const,
        rationale: 'Rendre la validation humaine visible avant tout envoi.',
      },
    ],
  };

  const target = targets.create(demoSession, 'demo-kosmio', input);
  assert.equal(target.status, 'proposed');
  assert.equal(target.based_on_revision, before.revision);
  assert.equal(target.validation, null);
  assert.deepEqual(models.getModel(demoSession, 'demo-kosmio', 'process-diagnostic'), before);

  const replay = targets.create(demoSession, 'demo-kosmio', input);
  assert.equal(replay.target_id, target.target_id);
  const validated = targets.validate(
    demoSession,
    'demo-kosmio',
    'process-diagnostic',
    target.target_id,
    {
      idempotency_key: 'validate-assisted-review-v1',
      base_version: target.version,
      justification: 'La Direction confirme cette cible comme scénario de travail à expérimenter.',
    },
  );
  assert.equal(validated.status, 'validated');
  assert.equal(validated.version, 2);
  assert.equal(validated.validation?.actor, demoSession.user_id);
  assert.match(validated.validation?.justification ?? '', /scénario de travail/i);

  const comparison = targets.compare(
    demoSession,
    'demo-kosmio',
    'process-diagnostic',
    target.target_id,
  );
  assert.equal(comparison.reference_status, 'current');
  assert.equal(comparison.reconciliation_required, false);
  assert.equal(comparison.changes[0].reference_value, 'Restituer le diagnostic');
  assert.equal(comparison.changes[0].current_value, 'Restituer le diagnostic');
  assert.equal(comparison.changes[0].target_value, 'Préparer et valider la restitution assistée');
  assert.equal(comparison.changes[0].prepared_by, 'ai');
  assert.equal(comparison.validation?.actor, demoSession.user_id);
  assert.equal(
    models
      .getModel(demoSession, 'demo-kosmio', 'process-diagnostic')
      .tasks.find((task) => task.id === 'task-restitution')?.label,
    'Restituer le diagnostic',
  );

  const currentChange = models.execute(demoSession, {
    schema_version: '1',
    command_id: 'change-current-after-target',
    dossier_id: 'demo-kosmio',
    model_id: 'process-diagnostic',
    base_revision: before.revision,
    origin: 'manual',
    operations: [
      {
        type: 'UPDATE_LABEL',
        element_id: 'task-restitution',
        label: 'Restituer le diagnostic révisé',
      },
    ],
  });
  assert.equal(currentChange.status, 'applied');

  const lateReplay = targets.create(demoSession, 'demo-kosmio', input);
  assert.equal(lateReplay.target_id, target.target_id);

  const outdated = targets.compare(
    demoSession,
    'demo-kosmio',
    'process-diagnostic',
    target.target_id,
  );
  assert.equal(outdated.reference_status, 'outdated');
  assert.equal(outdated.reconciliation_required, true);
  assert.equal(outdated.current_revision, before.revision + 1);
  assert.equal(outdated.changes[0].current_value, 'Restituer le diagnostic révisé');
  assert.equal(outdated.changes[0].target_value, 'Préparer et valider la restitution assistée');
});

test('T010 / FR-002 : une cible reste inaccessible hors du dossier privé', (t) => {
  const { targets } = fixture(t);
  const outsider = { user_id: 'outsider', application_role: 'consultant' as const, grants: [] };
  assert.throws(() => targets.list(outsider, 'demo-kosmio', 'process-diagnostic'), /ACCESS_DENIED/);
});
