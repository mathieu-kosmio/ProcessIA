import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ModelService, demoSession } from '../../src/application/model/service.ts';
import { BpmnService } from '../../src/adapters/bpmn/service.ts';

function fixture(t: TestContext) {
  const path = join(mkdtempSync(join(tmpdir(), 'processia-bpmn-')), 'test.sqlite');
  let models = new ModelService(path);
  let bpmn = new BpmnService(path, models);
  t.after(() => {
    bpmn.close();
    models.close();
  });
  return {
    get models() {
      return models;
    },
    get bpmn() {
      return bpmn;
    },
    reopen() {
      bpmn.close();
      models.close();
      models = new ModelService(path);
      bpmn = new BpmnService(path, models);
    },
  };
}

test('T008 / API publique : la navigation BPMN est persistée après réouverture', (t) => {
  const f = fixture(t);
  const before = f.bpmn.get(demoSession, 'demo-kosmio', 'process-diagnostic');
  const result = f.bpmn.execute(demoSession, 'demo-kosmio', 'process-diagnostic', {
    command_id: 'open-restitution',
    base_revision: before.revision,
    operations: [
      { type: 'TOGGLE_SUBPROCESS', subprocess_id: 'subprocess-restitution', collapsed: false },
      {
        type: 'SET_VIEW',
        open_process_id: 'process-consultant',
        breadcrumb_ids: ['bpmn-diagnostic', 'process-consultant', 'subprocess-restitution'],
        selected_id: 'task-revue',
        zoom: 1.4,
      },
    ],
  });
  assert.equal(result.status, 'applied');
  f.reopen();
  const after = f.bpmn.get(demoSession, 'demo-kosmio', 'process-diagnostic');
  assert.equal(after.revision, before.revision + 1);
  assert.equal(after.view.selected_id, 'task-revue');
  assert.equal(after.view.zoom, 1.4);
  assert.equal(after.nodes.find((node) => node.id === 'subprocess-restitution')?.collapsed, false);
});

test('T008 / TC-023 : un flux invalide et une commande obsolète restent sans effet', (t) => {
  const f = fixture(t);
  const before = f.bpmn.get(demoSession, 'demo-kosmio', 'process-diagnostic');
  const invalid = f.bpmn.execute(demoSession, 'demo-kosmio', 'process-diagnostic', {
    command_id: 'cross-pool-sequence',
    base_revision: before.revision,
    operations: [
      {
        type: 'ADD_FLOW',
        flow: {
          id: 'invalid-cross-pool',
          type: 'sequenceFlow',
          source_id: 'task-cadrage',
          target_id: 'task-validation-client',
        },
      },
    ],
  });
  assert.equal(invalid.status, 'rejected');
  assert.equal(invalid.code, 'CROSS_PARTICIPANT_SEQUENCE');
  assert.deepEqual(f.bpmn.get(demoSession, 'demo-kosmio', 'process-diagnostic'), before);

  const stale = f.bpmn.execute(demoSession, 'demo-kosmio', 'process-diagnostic', {
    command_id: 'stale-view',
    base_revision: before.revision - 1,
    operations: [
      { type: 'TOGGLE_SUBPROCESS', subprocess_id: 'subprocess-restitution', collapsed: false },
    ],
  });
  assert.equal(stale.status, 'conflict');
  assert.deepEqual(f.bpmn.get(demoSession, 'demo-kosmio', 'process-diagnostic'), before);
});

test('T008 / FR-002 : les droits sont contrôlés avant lecture et écriture BPMN', (t) => {
  const f = fixture(t);
  const outsider = { user_id: 'outsider', application_role: 'consultant' as const, grants: [] };
  assert.throws(() => f.bpmn.get(outsider, 'demo-kosmio', 'process-diagnostic'), /ACCESS_DENIED/);
  assert.throws(
    () =>
      f.bpmn.execute(outsider, 'demo-kosmio', 'process-diagnostic', {
        command_id: 'forbidden',
        base_revision: 0,
        operations: [
          { type: 'TOGGLE_SUBPROCESS', subprocess_id: 'subprocess-restitution', collapsed: false },
        ],
      }),
    /ACCESS_DENIED/,
  );
});
