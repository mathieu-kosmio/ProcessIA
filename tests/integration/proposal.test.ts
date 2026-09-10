import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ModelService, demoSession } from '../../src/application/model/service.ts';
import { proposeChanges } from '../../src/application/interviews/propose.ts';
import { demoProvider } from '../../src/adapters/ai/demo-provider.ts';

const input = {
  dossier_id: 'demo-kosmio',
  model_id: 'process-diagnostic',
  base_revision: 0,
  text: 'Ajoute une validation avant la restitution',
};
test('T001 / accès avant génération : un lecteur ne sollicite pas le fournisseur de modifications', async (t) => {
  const service = new ModelService(':memory:');
  t.after(() => service.close());
  let calls = 0;
  const reader = {
    ...demoSession,
    grants: demoSession.grants.map((grant) => ({ ...grant, write: false })),
  };
  await assert.rejects(
    proposeChanges(service, reader, input, {
      async propose() {
        calls++;
        return {};
      },
    }),
    /ACCESS_DENIED/,
  );
  assert.equal(calls, 0);
});
test('T001 / scénario écrit simulé : ajout avant restitution et clarification hors scénario', async (t) => {
  const service = new ModelService(':memory:');
  t.after(() => service.close());
  const proposal = await proposeChanges(service, demoSession, input, demoProvider);
  assert.equal(proposal.status, 'proposed');
  assert.equal(service.execute(demoSession, proposal.command).status, 'applied');
  const unclear = await proposeChanges(
    service,
    demoSession,
    { ...input, base_revision: 1, text: 'Supprime la validation' },
    demoProvider,
  );
  assert.equal(unclear.status, 'needs_clarification');
  assert.equal(service.getModel(demoSession, input.dossier_id, input.model_id).revision, 1);
});
test('T001 / AC-025-3 : une réponse tardive après une édition manuelle est signalée comme obsolète', async (t) => {
  const service = new ModelService(':memory:');
  t.after(() => service.close());
  const result = await proposeChanges(service, demoSession, input, {
    async propose() {
      service.execute(demoSession, {
        schema_version: '1',
        command_id: 'manual',
        dossier_id: input.dossier_id,
        model_id: input.model_id,
        base_revision: 0,
        origin: 'manual',
        operations: [
          { type: 'UPDATE_LABEL', element_id: 'task-restitution', label: 'Ma correction' },
        ],
      });
      return { operations: [{ type: 'ADD_TASK', task_id: 'late', label: 'Réponse tardive' }] };
    },
  });
  assert.equal(result.status, 'conflict');
  assert.equal(service.getModel(demoSession, input.dossier_id, input.model_id).tasks.length, 6);
});
test('T001 / TC-024 : une réponse fournisseur mal formée est rejetée sans modifier le modèle', async (t) => {
  const service = new ModelService(':memory:');
  t.after(() => service.close());
  const before = service.getModel(demoSession, input.dossier_id, input.model_id);
  const result = await proposeChanges(service, demoSession, input, {
    async propose() {
      return { operations: [{ type: 'DELETE_EVERYTHING' }] };
    },
  });
  assert.equal(result.status, 'rejected');
  assert.equal(result.code, 'INVALID_OPERATION');
  assert.deepEqual(service.getModel(demoSession, input.dossier_id, input.model_id), before);
});
test('T001 / FR-024 : une proposition fournisseur prévisualisée applique une commande liée à la demande', async (t) => {
  const service = new ModelService(':memory:');
  t.after(() => service.close());
  const proposal = await proposeChanges(service, demoSession, input, {
    async propose(model) {
      assert.equal(model.dossier_id, 'demo-kosmio');
      return {
        operations: [
          {
            type: 'ADD_TASK',
            task_id: 'task-validation',
            label: 'Valider les recommandations',
            before_id: 'task-restitution',
          },
        ],
      };
    },
  });
  assert.equal(proposal.status, 'proposed');
  assert.equal(service.getModel(demoSession, input.dossier_id, input.model_id).revision, 0);
  assert.equal(service.execute(demoSession, proposal.command).status, 'applied');
  assert.equal(
    service.getHistory(demoSession, input.dossier_id, input.model_id)[0].statement,
    input.text,
  );
});
