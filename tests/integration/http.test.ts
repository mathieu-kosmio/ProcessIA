import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { ModelService } from '../../src/application/model/service.ts';
import { createAppServer } from '../../src/server/http.ts';

test('T001 / API : lire, proposer, appliquer et relire le modèle via HTTP', async (t) => {
  const service = new ModelService(':memory:');
  const server = createAppServer(service);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    service.close();
  });
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const modelResponse = await fetch(`${base}/api/dossiers/demo-kosmio/models/process-diagnostic`);
  assert.equal(modelResponse.status, 200);
  const model = await modelResponse.json();
  assert.equal(model.revision, 0);
  const response = await fetch(`${base}/api/proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({
      dossier_id: model.dossier_id,
      model_id: model.id,
      base_revision: model.revision,
      text: 'Ajoute une validation avant la restitution',
    }),
  });
  assert.equal(response.status, 200);
  const proposal = await response.json();
  assert.equal(proposal.status, 'proposed');
  const apply = await fetch(`${base}/api/commands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify(proposal.command),
  });
  assert.equal(apply.status, 200);
  const reload = await fetch(`${base}/api/dossiers/demo-kosmio/models/process-diagnostic`).then(
    (response) => response.json(),
  );
  assert.equal(reload.revision, 1);
  assert.equal(reload.tasks.length, 7);
  const denied = await fetch(`${base}/api/dossiers/other-company/models/process-diagnostic`);
  const missing = await fetch(`${base}/api/dossiers/unknown/models/process-diagnostic`);
  assert.equal(denied.status, 403);
  assert.deepEqual(await denied.json(), await missing.json());
  const foreignOrigin = await fetch(`${base}/api/commands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://untrusted.example' },
    body: JSON.stringify(proposal.command),
  });
  assert.equal(foreignOrigin.status, 403);
  const malformed = await fetch(`${base}/api/commands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: '{',
  });
  assert.equal(malformed.status, 400);
  const impersonation = await fetch(`${base}/api/commands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ ...proposal.command, user_id: 'admin' }),
  });
  assert.equal(impersonation.status, 422);
  assert.equal(
    (
      await fetch(`${base}/api/dossiers/demo-kosmio/models/process-diagnostic`).then((response) =>
        response.json(),
      )
    ).revision,
    1,
  );
});
