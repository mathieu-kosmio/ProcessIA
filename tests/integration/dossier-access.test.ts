import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { ModelService, demoSession } from '../../src/application/model/service.ts';
import { createAppServer } from '../../src/server/http.ts';
import type { Session } from '../../src/contracts/model.ts';

async function start(service: ModelService, session: Session) {
  const server = createAppServer(service, undefined, session);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as { port: number };
  return { server, base: `http://127.0.0.1:${port}` };
}

async function post(base: string, path: string, data: unknown) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify(data),
  });
}

test('T002 / TC-001 : deux dossiers de même nom restent distincts via l’API publique', async (t) => {
  const service = new ModelService(':memory:');
  const consultant = await start(service, demoSession);
  t.after(async () => {
    await new Promise<void>((resolve) => consultant.server.close(() => resolve()));
    service.close();
  });

  const first = await post(consultant.base, '/api/dossiers', {
    name: 'Entreprise exemple',
    activity: 'Conseil',
  });
  const second = await post(consultant.base, '/api/dossiers', {
    name: 'Entreprise exemple',
    activity: null,
  });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  const dossierA = await first.json();
  const dossierB = await second.json();
  assert.notEqual(dossierA.id, dossierB.id);
  assert.deepEqual(dossierA.available_spaces, ['private', 'shared']);
  assert.equal(dossierB.activity, null);

  const list = await fetch(`${consultant.base}/api/dossiers`).then((response) => response.json());
  const matches = list.items.filter(
    (dossier: { name: string }) => dossier.name === 'Entreprise exemple',
  );
  assert.equal(matches.length, 2);
  assert.notEqual(matches[0].id, matches[1].id);
});

test('T002 / TC-002 : le responsable voit uniquement l’espace partagé de son dossier', async (t) => {
  const service = new ModelService(':memory:');
  const consultant = await start(service, demoSession);
  const clientSession: Session = {
    user_id: 'client-a',
    application_role: 'responsable',
    grants: [],
  };
  const client = await start(service, clientSession);
  t.after(async () => {
    await Promise.all([
      new Promise<void>((resolve) => consultant.server.close(() => resolve())),
      new Promise<void>((resolve) => client.server.close(() => resolve())),
    ]);
    service.close();
  });

  const dossierA = await post(consultant.base, '/api/dossiers', {
    name: 'Client A',
    activity: 'Industrie',
  }).then((response) => response.json());
  const dossierB = await post(consultant.base, '/api/dossiers', {
    name: 'Client B',
    activity: 'Services',
  }).then((response) => response.json());
  service.grantDossierAccess(
    demoSession,
    dossierA.id,
    clientSession.user_id,
    'responsable',
    'shared',
  );

  const own = await fetch(`${client.base}/api/dossiers/${dossierA.id}`);
  assert.equal(own.status, 200);
  assert.deepEqual((await own.json()).available_spaces, ['shared']);
  const privateModel = await fetch(
    `${client.base}/api/dossiers/${dossierA.id}/models/process-diagnostic`,
  );
  assert.equal(privateModel.status, 403);
  const other = await fetch(`${client.base}/api/dossiers/${dossierB.id}`);
  const unknown = await fetch(`${client.base}/api/dossiers/unknown-dossier`);
  assert.equal(other.status, 403);
  assert.deepEqual(await other.json(), await unknown.json());
  const list = await fetch(`${client.base}/api/dossiers`).then((response) => response.json());
  assert.deepEqual(
    list.items.map((item: { id: string }) => item.id),
    [dossierA.id],
  );

  service.revokeDossierAccess(demoSession, dossierA.id, clientSession.user_id);
  const revoked = await fetch(`${client.base}/api/dossiers/${dossierA.id}`);
  assert.equal(revoked.status, 403);
  assert.deepEqual(
    await revoked.json(),
    await fetch(`${client.base}/api/dossiers/unknown`).then((response) => response.json()),
  );

  const delegated: Session = {
    user_id: 'delegated-consultant',
    application_role: 'consultant',
    grants: [{ dossier_id: dossierB.id, model_id: 'process-diagnostic', write: true }],
  };
  service.grantDossierAccess(demoSession, dossierB.id, delegated.user_id, 'consultant', 'private');
  assert.equal(service.getModel(delegated, dossierB.id, 'process-diagnostic').revision, 0);
  service.revokeDossierAccess(demoSession, dossierB.id, delegated.user_id);
  assert.throws(
    () => service.getModel(delegated, dossierB.id, 'process-diagnostic'),
    /ACCESS_DENIED/,
  );
});
