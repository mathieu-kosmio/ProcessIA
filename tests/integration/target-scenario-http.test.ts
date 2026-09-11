import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ModelService, demoSession } from '../../src/application/model/service.ts';
import { TargetScenarioService } from '../../src/application/diagnostic/target-service.ts';
import { createAppServer } from '../../src/server/http.ts';

test('T010 / HTTP : créer, valider et comparer un scénario cible', async (t) => {
  const path = join(mkdtempSync(join(tmpdir(), 'processia-target-http-')), 'test.sqlite');
  const models = new ModelService(path);
  const targets = new TargetScenarioService(path, models);
  const server = createAppServer(models, undefined, demoSession, { targets });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    targets.close();
    models.close();
  });
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const route = `${base}/api/dossiers/demo-kosmio/models/process-diagnostic/targets`;
  const payload = {
    idempotency_key: 'target-http-v1',
    base_revision: 0,
    name: 'Restitution assistée',
    changes: [
      {
        change_id: 'change-restitution-work',
        type: 'update_task_label',
        task_id: 'task-restitution',
        before_label: 'Restituer le diagnostic',
        after_label: 'Préparer et valider la restitution assistée',
        prepared_by: 'ai',
        rationale: 'Rendre la validation humaine visible avant tout envoi.',
      },
    ],
  };

  const createdResponse = await fetch(route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify(payload),
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.equal(created.status, 'proposed');

  const validationResponse = await fetch(`${route}/${created.target_id}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({
      idempotency_key: 'target-http-validation-v1',
      base_version: 1,
      justification: 'Cible retenue comme scénario à expérimenter.',
    }),
  });
  assert.equal(validationResponse.status, 200);
  assert.equal((await validationResponse.json()).status, 'validated');

  const listResponse = await fetch(route);
  assert.equal(listResponse.status, 200);
  const comparison = (await listResponse.json()).items[0];
  assert.equal(comparison.reference_status, 'current');
  assert.equal(comparison.changes[0].target_value, payload.changes[0].after_label);
  assert.equal(comparison.validation.actor, demoSession.user_id);

  const malformed = await fetch(route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ ...payload, user_id: 'admin' }),
  });
  assert.equal(malformed.status, 400);
});
