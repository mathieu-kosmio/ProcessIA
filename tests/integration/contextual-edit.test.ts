import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ModelService, demoSession } from '../../src/application/model/service.ts';
import { proposeChanges } from '../../src/application/interviews/propose.ts';
import { demoProvider } from '../../src/adapters/ai/demo-provider.ts';

const target = {
  dossier_id: 'demo-kosmio',
  model_id: 'process-diagnostic',
  base_revision: 0,
  view: 'map' as const,
  selected_id: 'task-restitution',
};

test('T006 / TC-026 : une information contextuelle reste attachée à la sélection initiale', async (t) => {
  const service = new ModelService(':memory:');
  t.after(() => service.close());

  const proposal = await proposeChanges(
    service,
    demoSession,
    { ...target, text: 'Ici nous utilisons un modèle de restitution' },
    demoProvider,
  );

  assert.equal(proposal.status, 'proposed');
  assert.deepEqual(proposal.context, {
    dossier_id: target.dossier_id,
    model_id: target.model_id,
    view: 'map',
    revision: 0,
    selected_id: 'task-restitution',
    selected_label: 'Restituer le diagnostic',
  });
  assert.deepEqual(proposal.command?.selection_snapshot, {
    element_id: 'task-restitution',
    revision: 0,
  });
  assert.equal(proposal.command?.view_snapshot, 'map');

  assert.equal(service.execute(demoSession, proposal.command).status, 'applied');
  const model = service.getModel(demoSession, target.dossier_id, target.model_id);
  const restitution = model.tasks.find((task) => task.id === 'task-restitution')!;
  const preparation = model.tasks.find((task) => task.id === 'task-preparation')!;
  const informationId = restitution.details.inputs.ids[0];
  assert.equal(
    model.information.find((item) => item.id === informationId)?.label,
    'Modèle de restitution',
  );
  assert.equal(model.information.find((item) => item.id === informationId)?.category, 'template');
  assert.equal(restitution.details.inputs.knowledge, 'to_confirm');
  assert.deepEqual(preparation.details.inputs.ids, []);
  assert.equal(
    service.getHistory(demoSession, target.dossier_id, target.model_id)[0].statement,
    'Ici nous utilisons un modèle de restitution',
  );
});

test('T006 / TC-020 : une référence contextuelle sans sélection demande une clarification', async (t) => {
  const service = new ModelService(':memory:');
  t.after(() => service.close());

  const proposal = await proposeChanges(
    service,
    demoSession,
    {
      dossier_id: target.dossier_id,
      model_id: target.model_id,
      base_revision: 0,
      view: 'list',
      text: 'Ici nous utilisons un modèle',
    },
    demoProvider,
  );

  assert.equal(proposal.status, 'needs_clarification');
  assert.match(proposal.message, /Quelle tâche/);
  assert.equal(service.getModel(demoSession, target.dossier_id, target.model_id).revision, 0);
});

test('T006 / TC-024 : ajouter après la sélection conserve un chaînage atomique et annulable', async (t) => {
  const service = new ModelService(':memory:');
  t.after(() => service.close());

  const proposal = await proposeChanges(
    service,
    demoSession,
    {
      ...target,
      selected_id: 'task-modelisation',
      text: 'Ajoute une validation après cette tâche',
    },
    demoProvider,
  );
  assert.equal(proposal.status, 'proposed');
  const result = service.execute(demoSession, proposal.command);
  assert.equal(result.status, 'applied');

  const model = service.getModel(demoSession, target.dossier_id, target.model_id);
  const added = model.tasks.find((task) => task.label === 'Valider le modèle')!;
  assert.ok(added);
  assert.ok(
    model.links.some((link) => link.source === 'task-modelisation' && link.target === added.id),
  );
  assert.ok(
    model.links.some((link) => link.source === added.id && link.target === 'task-opportunites'),
  );
  assert.equal(
    model.links.some(
      (link) => link.source === 'task-modelisation' && link.target === 'task-opportunites',
    ),
    false,
  );

  const undo = service.execute(demoSession, {
    schema_version: '1',
    command_id: 'undo-contextual-add',
    dossier_id: target.dossier_id,
    model_id: target.model_id,
    base_revision: 1,
    origin: 'manual',
    operations: [{ type: 'UNDO', target_command_id: proposal.command!.command_id }],
  });
  assert.equal(undo.status, 'applied');
  const restored = service.getModel(demoSession, target.dossier_id, target.model_id);
  assert.equal(
    restored.tasks.some((task) => task.id === added.id),
    false,
  );
  assert.ok(
    restored.links.some(
      (link) => link.source === 'task-modelisation' && link.target === 'task-opportunites',
    ),
  );
});

test('T006 / TC-020 : une proposition préparée sur une ancienne révision est suspendue', async (t) => {
  const service = new ModelService(':memory:');
  t.after(() => service.close());
  const proposal = await proposeChanges(
    service,
    demoSession,
    { ...target, text: 'Ici nous utilisons un modèle' },
    demoProvider,
  );
  service.execute(demoSession, {
    schema_version: '1',
    command_id: 'concurrent-context-edit',
    dossier_id: target.dossier_id,
    model_id: target.model_id,
    base_revision: 0,
    origin: 'manual',
    operations: [
      { type: 'UPDATE_LABEL', element_id: 'task-restitution', label: 'Préparer la restitution' },
    ],
  });

  const result = service.execute(demoSession, proposal.command);
  assert.equal(result.status, 'conflict');
  assert.match(result.message ?? '', /revoyez votre modification/);
  assert.deepEqual(
    service
      .getModel(demoSession, target.dossier_id, target.model_id)
      .tasks.find((task) => task.id === 'task-restitution')!.details.inputs.ids,
    [],
  );
});
