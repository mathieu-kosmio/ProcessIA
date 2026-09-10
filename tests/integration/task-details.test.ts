import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ModelService, demoSession } from '../../src/application/model/service.ts';

function fixture(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'processia-task-details-'));
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

test('T003 / TC-027 à TC-029 : une tâche conserve ses références métier et leurs identifiants après renommage', (t) => {
  const f = fixture(t);
  const attach = f.service.execute(demoSession, {
    schema_version: '1',
    command_id: 'cmd-document-task',
    dossier_id: 'demo-kosmio',
    model_id: 'process-diagnostic',
    base_revision: 0,
    origin: 'manual',
    operations: [
      { type: 'UPSERT_ROLE', role_id: 'role-direction', label: 'Direction' },
      { type: 'UPSERT_TOOL', tool_id: 'tool-tableur', label: 'Tableur' },
      {
        type: 'UPSERT_INFORMATION',
        information_id: 'information-analyse',
        label: 'Analyse consolidée',
        category: 'data',
      },
      {
        type: 'UPSERT_INFORMATION',
        information_id: 'information-restitution',
        label: 'Support de restitution',
        category: 'deliverable',
      },
      {
        type: 'SET_TASK_ROLE',
        task_id: 'task-restitution',
        role_id: 'role-direction',
        knowledge: 'to_confirm',
      },
      {
        type: 'SET_TASK_ROLE',
        task_id: 'task-opportunites',
        role_id: 'role-direction',
        knowledge: 'to_confirm',
      },
      {
        type: 'SET_TASK_ROLE',
        task_id: 'task-priorisation',
        role_id: 'role-direction',
        knowledge: 'to_confirm',
      },
      {
        type: 'SET_TASK_TOOL',
        task_id: 'task-restitution',
        tool_ids: ['tool-tableur'],
        knowledge: 'to_confirm',
      },
      {
        type: 'LINK_INFORMATION',
        task_id: 'task-restitution',
        direction: 'input',
        information_ids: ['information-analyse'],
        knowledge: 'to_confirm',
      },
      {
        type: 'LINK_INFORMATION',
        task_id: 'task-restitution',
        direction: 'output',
        information_ids: ['information-restitution'],
        knowledge: 'to_confirm',
      },
    ],
  });
  assert.equal(attach.status, 'applied');

  const rename = f.service.execute(demoSession, {
    schema_version: '1',
    command_id: 'cmd-rename-task-details',
    dossier_id: 'demo-kosmio',
    model_id: 'process-diagnostic',
    base_revision: 1,
    origin: 'manual',
    operations: [
      {
        type: 'UPDATE_LABEL',
        element_id: 'task-restitution',
        label: 'Présenter le diagnostic',
      },
      { type: 'UPDATE_LABEL', element_id: 'role-direction', label: 'Équipe de direction' },
      { type: 'UPDATE_LABEL', element_id: 'tool-tableur', label: 'Tableur partagé' },
      {
        type: 'UPDATE_LABEL',
        element_id: 'information-analyse',
        label: 'Analyse validée',
      },
      {
        type: 'UPDATE_LABEL',
        element_id: 'information-restitution',
        label: 'Diagnostic présenté',
      },
    ],
  });
  assert.equal(rename.status, 'applied');

  f.reopen();
  const model = f.service.getModel(demoSession, 'demo-kosmio', 'process-diagnostic');
  const task = model.tasks.find((item) => item.id === 'task-restitution');
  assert.deepEqual(task?.details, {
    role: { ids: ['role-direction'], knowledge: 'to_confirm' },
    tools: { ids: ['tool-tableur'], knowledge: 'to_confirm' },
    inputs: { ids: ['information-analyse'], knowledge: 'to_confirm' },
    outputs: { ids: ['information-restitution'], knowledge: 'to_confirm' },
  });
  assert.equal(
    model.roles.find((item) => item.id === 'role-direction')?.label,
    'Équipe de direction',
  );
  assert.deepEqual(
    model.tasks
      .filter((item) => item.details.role.ids.includes('role-direction'))
      .map((item) => item.id)
      .sort(),
    ['task-opportunites', 'task-priorisation', 'task-restitution'],
  );
  assert.equal(
    model.tasks
      .filter((item) => item.details.role.ids.includes('role-direction'))
      .every((item) => item.role === 'Équipe de direction'),
    true,
  );
  assert.equal(model.tools.find((item) => item.id === 'tool-tableur')?.label, 'Tableur partagé');
  assert.equal(
    model.information.find((item) => item.id === 'information-analyse')?.label,
    'Analyse validée',
  );
  assert.equal(
    model.information.find((item) => item.id === 'information-restitution')?.category,
    'deliverable',
  );
});
