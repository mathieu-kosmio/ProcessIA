import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { ModelService } from '../../src/application/model/service.ts';
import { BpmnService } from '../../src/adapters/bpmn/service.ts';
import { createAppServer } from '../../src/server/http.ts';

test('T008 / HTTP : lire, valider et naviguer dans le profil BPMN', async (t) => {
  const models = new ModelService(':memory:');
  const bpmn = new BpmnService(':memory:', models);
  const server = createAppServer(models, undefined, undefined, { bpmn });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    bpmn.close();
    models.close();
  });
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const path = `${base}/api/dossiers/demo-kosmio/models/process-diagnostic/bpmn`;

  const before = await fetch(path).then((response) => response.json());
  assert.equal(before.revision, 0);
  assert.equal(before.participants.length, 2);

  const validationResponse = await fetch(`${path}/validation`);
  assert.equal(validationResponse.status, 200);
  const validation = await validationResponse.json();
  assert.equal(validation.valid_for_export, false);
  assert.equal(validation.anomalies.length, 2);

  const invalid = await fetch(`${path}/commands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({
      command_id: 'invalid-http-flow',
      base_revision: 0,
      operations: [
        {
          type: 'ADD_FLOW',
          flow: {
            id: 'invalid-http-flow-id',
            type: 'sequenceFlow',
            source_id: 'task-cadrage',
            target_id: 'task-validation-client',
          },
        },
      ],
    }),
  });
  assert.equal(invalid.status, 422);
  assert.equal((await invalid.json()).code, 'CROSS_PARTICIPANT_SEQUENCE');

  const applied = await fetch(`${path}/commands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({
      command_id: 'open-http-subprocess',
      base_revision: 0,
      operations: [
        { type: 'TOGGLE_SUBPROCESS', subprocess_id: 'subprocess-restitution', collapsed: false },
      ],
    }),
  });
  assert.equal(applied.status, 200);
  assert.equal((await applied.json()).document.revision, 1);

  const stale = await fetch(`${path}/commands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({
      command_id: 'stale-http-command',
      base_revision: 0,
      operations: [
        { type: 'TOGGLE_SUBPROCESS', subprocess_id: 'subprocess-restitution', collapsed: true },
      ],
    }),
  });
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).code, 'REVISION_CONFLICT');
});
