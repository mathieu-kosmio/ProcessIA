import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ModelService, demoSession } from '../../src/application/model/service.ts';

function fixture(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'processia-'));
  let service = new ModelService(join(directory, 'test.sqlite'));
  t.after(() => {
    service.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return {
    get service() {
      return service;
    },
    reopen() {
      service.close();
      service = new ModelService(join(directory, 'test.sqlite'));
    },
  };
}

const command = (overrides = {}) => ({
  schema_version: '1',
  command_id: 'cmd-add-validation',
  dossier_id: 'demo-kosmio',
  model_id: 'process-diagnostic',
  base_revision: 0,
  origin: 'manual',
  operations: [
    {
      type: 'ADD_TASK',
      task_id: 'task-validation',
      label: 'Valider les recommandations',
      before_id: 'task-restitution',
    },
  ],
  ...overrides,
});

test('T001 / contexte : une sélection incohérente ne peut pas autoriser une mutation', (t) => {
  const f = fixture(t);
  const result = f.service.execute(
    demoSession,
    command({ selection_snapshot: { element_id: 'task-restitution', revision: 99 } }),
  );
  assert.equal(result.status, 'rejected');
  assert.equal(f.service.getModel(demoSession, 'demo-kosmio', 'process-diagnostic').revision, 0);
});

test('T001 / AC-024-3 : annuler restaure le graphe complet dans une nouvelle révision et conserve le journal', (t) => {
  const f = fixture(t);
  const before = f.service.getModel(demoSession, 'demo-kosmio', 'process-diagnostic');
  f.service.execute(
    demoSession,
    command({
      origin: 'conversation',
      statement: 'Ajoute une validation avant la restitution',
      turn_id: 'turn-1',
    }),
  );
  const undo = f.service.execute(
    demoSession,
    command({
      command_id: 'cmd-undo',
      base_revision: 1,
      operations: [{ type: 'UNDO', target_command_id: 'cmd-add-validation' }],
    }),
  );
  assert.equal(undo.status, 'applied');
  f.reopen();
  assert.deepEqual(f.service.getModel(demoSession, 'demo-kosmio', 'process-diagnostic'), {
    ...before,
    revision: 2,
  });
  const history = f.service.getHistory(demoSession, 'demo-kosmio', 'process-diagnostic');
  assert.equal(history.length, 2);
  assert.equal(history[1].statement, 'Ajoute une validation avant la restitution');
  assert.equal(history[1].actor, 'local-consultant');
});

test('T001 / FR-025 : renommer une tâche conserve ses identifiants et les autres éléments', (t) => {
  const f = fixture(t);
  const before = f.service.getModel(demoSession, 'demo-kosmio', 'process-diagnostic');
  assert.equal(
    f.service.execute(
      demoSession,
      command({
        operations: [
          {
            type: 'UPDATE_LABEL',
            element_id: 'task-restitution',
            label: 'Présenter la feuille de route',
          },
        ],
      }),
    ).status,
    'applied',
  );
  const after = f.service.getModel(demoSession, 'demo-kosmio', 'process-diagnostic');
  assert.deepEqual(
    after.tasks,
    before.tasks.map((task) =>
      task.id === 'task-restitution' ? { ...task, label: 'Présenter la feuille de route' } : task,
    ),
  );
  assert.deepEqual(after.links, before.links);
});

test('T001 / AC-025-1 : déplacer une tâche conserve son identité, ses liens et son rôle', (t) => {
  const f = fixture(t);
  const before = f.service.getModel(demoSession, 'demo-kosmio', 'process-diagnostic');
  assert.equal(
    f.service.execute(
      demoSession,
      command({
        operations: [
          { type: 'MOVE_ELEMENT', element_id: 'task-restitution', position: { x: 520, y: 240 } },
        ],
      }),
    ).status,
    'applied',
  );
  f.reopen();
  const after = f.service.getModel(demoSession, 'demo-kosmio', 'process-diagnostic');
  assert.deepEqual(after.links, before.links);
  assert.deepEqual(
    after.tasks,
    before.tasks.map((task) =>
      task.id === 'task-restitution' ? { ...task, position: { x: 520, y: 240 } } : task,
    ),
  );
});

test('T001 / socle FR-002 : droits vérifiés avant lecture, écriture et rejeu', (t) => {
  const f = fixture(t);
  const stranger = { user_id: 'other-company', grants: [] };
  assert.throws(
    () => f.service.getModel(stranger, 'demo-kosmio', 'process-diagnostic'),
    /ACCESS_DENIED/,
  );
  assert.equal(f.service.execute(stranger, command()).code, 'ACCESS_DENIED');
  const reader = { user_id: 'local-reader', application_role: 'consultant' as const, grants: [] };
  f.service.grantDossierAccess(
    demoSession,
    'demo-kosmio',
    reader.user_id,
    'consultant',
    'private',
    false,
  );
  assert.equal(f.service.execute(reader, command()).code, 'ACCESS_DENIED');
  f.service.execute(demoSession, command());
  assert.equal(f.service.execute(stranger, command()).code, 'ACCESS_DENIED');
  assert.throws(
    () => f.service.getModel(demoSession, 'other-company', 'process-diagnostic'),
    /ACCESS_DENIED/,
  );
});

test('T001 / contrat : un rejeu après reconnexion ne crée pas de doublon, une clé réutilisée autrement est refusée', (t) => {
  const f = fixture(t);
  f.service.execute(demoSession, command());
  f.reopen();
  const replay = f.service.execute(demoSession, command());
  assert.equal(replay.status, 'duplicate');
  assert.equal(replay.revision, 1);
  assert.equal(
    f.service.execute(demoSession, command({ base_revision: 1 })).code,
    'IDEMPOTENCY_CONFLICT',
  );
  assert.equal(f.service.getModel(demoSession, 'demo-kosmio', 'process-diagnostic').revision, 1);
});

test('T001 / AC-025-3 : deux connexions sur la même révision produisent une application et un conflit', (t) => {
  const f = fixture(t);
  assert.equal(f.service.execute(demoSession, command()).status, 'applied');
  f.reopen();
  const result = f.service.execute(
    demoSession,
    command({
      command_id: 'cmd-second',
      operations: [{ type: 'ADD_TASK', task_id: 'task-concurrent', label: 'Édition concurrente' }],
    }),
  );
  assert.equal(result.status, 'conflict');
  assert.equal(result.code, 'REVISION_CONFLICT');
  assert.equal(
    f.service.getModel(demoSession, 'demo-kosmio', 'process-diagnostic').tasks.length,
    7,
  );
});

test('T001 / TC-024 : un lot contenant une cible absente est intégralement rejeté', (t) => {
  const f = fixture(t);
  const before = f.service.getModel(demoSession, 'demo-kosmio', 'process-diagnostic');
  const result = f.service.execute(
    demoSession,
    command({
      operations: [
        command().operations[0],
        { type: 'ADD_TASK', task_id: 'task-other', label: 'Autre tâche', before_id: 'absent' },
      ],
    }),
  );
  assert.equal(result.status, 'rejected');
  assert.equal(result.code, 'INVALID_OPERATION');
  f.reopen();
  assert.deepEqual(f.service.getModel(demoSession, 'demo-kosmio', 'process-diagnostic'), before);
});

test('T001 / TC-024 : un ajout et ses liens sont retrouvés après réouverture de la base', (t) => {
  const f = fixture(t);
  const result = f.service.execute(demoSession, command());
  assert.equal(result.status, 'applied');
  f.reopen();
  const model = f.service.getModel(demoSession, 'demo-kosmio', 'process-diagnostic');
  assert.equal(model.revision, 1);
  assert.equal(
    model.tasks.find((task) => task.id === 'task-validation')?.label,
    'Valider les recommandations',
  );
  assert.ok(
    model.links.some(
      (link) => link.source === 'task-validation' && link.target === 'task-restitution',
    ),
  );
});

test('T001 / disposition : deux ajouts successifs restent distincts sans déplacer les tâches existantes', (t) => {
  const f = fixture(t);
  const before = f.service.getModel(demoSession, 'demo-kosmio', 'process-diagnostic');
  f.service.execute(demoSession, command());
  f.service.execute(
    demoSession,
    command({
      command_id: 'second-add',
      base_revision: 1,
      operations: [{ ...command().operations[0], task_id: 'second-validation' }],
    }),
  );
  const after = f.service.getModel(demoSession, 'demo-kosmio', 'process-diagnostic');
  const positions = after.tasks.map((task) => `${task.position.x}:${task.position.y}`);
  assert.equal(new Set(positions).size, positions.length);
  assert.deepEqual(after.tasks.slice(0, before.tasks.length), before.tasks);
});
