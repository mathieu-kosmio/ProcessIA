import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, type TestContext } from 'node:test';
import { ModelService, demoSession } from '../../src/application/model/service.ts';
import { SharingService } from '../../src/application/sharing/service.ts';
import { SourceService } from '../../src/application/sources/service.ts';
import type { Session } from '../../src/contracts/model.ts';
import { createAppServer } from '../../src/server/http.ts';

async function start(
  t: TestContext,
  models: ModelService,
  sources: SourceService,
  sharing: SharingService,
  session: Session,
) {
  const server = createAppServer(models, undefined, session, { sources, sharing });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const { port } = server.address() as { port: number };
  return `http://127.0.0.1:${port}`;
}

async function post(base: string, path: string, data: unknown) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify(data),
  });
}

test('T005 / TC-003 à TC-007 : partager une reformulation sans révéler sa source privée', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'processia-sharing-'));
  const databasePath = join(directory, 'processia.sqlite');
  const models = new ModelService(databasePath);
  const sources = new SourceService(databasePath);
  const sharing = new SharingService(databasePath);
  t.after(async () => {
    sharing.close();
    sources.close();
    models.close();
    await rm(directory, { recursive: true, force: true });
  });

  const clientSession: Session = {
    user_id: 'responsable-client',
    application_role: 'responsable',
    grants: [],
  };
  models.grantDossierAccess(
    demoSession,
    'demo-kosmio',
    clientSession.user_id,
    'responsable',
    'shared',
  );
  const consultantBase = await start(t, models, sources, sharing, demoSession);
  const clientBase = await start(t, models, sources, sharing, clientSession);

  const privateMarker = 'MARQUEUR-PRIVE-ALPHA';
  const imported = sources.add(demoSession, {
    dossier_id: 'demo-kosmio',
    idempotency_key: 'source-privee-t005',
    title: 'Entretien confidentiel direction',
    source_type: 'transcript',
    origin_context: 'Lien privé https://example.test/confidentiel',
    source_date: null,
    content: `${privateMarker}. Les validations sont réalisées avant la restitution.`,
  });
  const privateStatus = sources.status(demoSession, 'demo-kosmio', imported.source_id);
  const passage = privateStatus.passages[0];

  const privateSourceAttempt = await fetch(
    `${clientBase}/api/dossiers/demo-kosmio/sources/${imported.source_id}/status`,
  );
  const unknownSourceAttempt = await fetch(
    `${clientBase}/api/dossiers/demo-kosmio/sources/source-inconnue/status`,
  );
  assert.equal(privateSourceAttempt.status, 403);
  assert.deepEqual(await privateSourceAttempt.json(), await unknownSourceAttempt.json());

  const previewResponse = await post(consultantBase, '/api/dossiers/demo-kosmio/sharing/previews', {
    source_id: imported.source_id,
    source_version: 1,
    passage_id: passage.passage_id,
    shared_text: 'Une revue des recommandations précède la restitution.',
  });
  assert.equal(previewResponse.status, 200);
  const preview = await previewResponse.json();
  assert.match(preview.preview_id, /^[a-f0-9-]{36}$/);
  assert.deepEqual(preview, {
    preview_id: preview.preview_id,
    shared_text: 'Une revue des recommandations précède la restitution.',
    source_version: 1,
    state: 'preview',
    visibility: 'shared_after_confirmation',
  });

  const beforeConfirmation = await fetch(`${clientBase}/api/dossiers/demo-kosmio/shared-knowledge`);
  assert.equal(beforeConfirmation.status, 200);
  assert.deepEqual(await beforeConfirmation.json(), { items: [] });

  const publicationResponse = await post(
    consultantBase,
    '/api/dossiers/demo-kosmio/sharing/publications',
    { preview_id: preview.preview_id, idempotency_key: 'publication-t005' },
  );
  const replayResponse = await post(
    consultantBase,
    '/api/dossiers/demo-kosmio/sharing/publications',
    { preview_id: preview.preview_id, idempotency_key: 'publication-t005' },
  );
  assert.equal(publicationResponse.status, 201);
  assert.deepEqual(await replayResponse.json(), await publicationResponse.clone().json());
  const publication = await publicationResponse.json();

  const clientProjectionResponse = await fetch(
    `${clientBase}/api/dossiers/demo-kosmio/shared-knowledge`,
  );
  assert.equal(clientProjectionResponse.status, 200);
  const clientProjection = await clientProjectionResponse.json();
  assert.equal(clientProjection.items.length, 1);
  assert.deepEqual(clientProjection.items[0], {
    publication_id: publication.publication_id,
    text: 'Une revue des recommandations précède la restitution.',
    version: 1,
    published_at: publication.published_at,
    provenance: { kind: 'private_source', details_available: false },
  });
  const serializedClientProjection = JSON.stringify(clientProjection);
  for (const privateValue of [
    privateMarker,
    imported.source_id,
    passage.passage_id,
    'Entretien confidentiel direction',
    'example.test',
  ])
    assert.equal(serializedClientProjection.includes(privateValue), false);

  const consultantProjection = await fetch(
    `${consultantBase}/api/dossiers/demo-kosmio/shared-knowledge`,
  ).then((response) => response.json());
  assert.deepEqual(consultantProjection.items[0].provenance, {
    kind: 'private_source',
    details_available: true,
    source_id: imported.source_id,
    source_version: 1,
    passage_id: passage.passage_id,
    source_title: 'Entretien confidentiel direction',
    passage_text: passage.text,
  });

  const cancelledPreview = await post(
    consultantBase,
    '/api/dossiers/demo-kosmio/sharing/previews',
    {
      source_id: imported.source_id,
      source_version: 1,
      passage_id: passage.passage_id,
      shared_text: 'Cette formulation sera annulée.',
    },
  ).then((response) => response.json());
  const cancelResponse = await post(
    consultantBase,
    `/api/dossiers/demo-kosmio/sharing/previews/${cancelledPreview.preview_id}/cancel`,
    {},
  );
  assert.equal(cancelResponse.status, 200);
  const publishCancelled = await post(
    consultantBase,
    '/api/dossiers/demo-kosmio/sharing/publications',
    { preview_id: cancelledPreview.preview_id, idempotency_key: 'publication-annulee' },
  );
  assert.equal(publishCancelled.status, 409);

  const conflictingPreview = await post(
    consultantBase,
    '/api/dossiers/demo-kosmio/sharing/previews',
    {
      source_id: imported.source_id,
      source_version: 1,
      passage_id: passage.passage_id,
      shared_text: 'Une autre formulation.',
    },
  ).then((response) => response.json());
  const conflictingKey = await post(
    consultantBase,
    '/api/dossiers/demo-kosmio/sharing/publications',
    { preview_id: conflictingPreview.preview_id, idempotency_key: 'publication-t005' },
  );
  assert.equal(conflictingKey.status, 409);

  const revoked = await post(
    consultantBase,
    `/api/dossiers/demo-kosmio/shared-knowledge/${publication.publication_id}/revoke`,
    { base_version: 1 },
  );
  assert.equal(revoked.status, 200);
  assert.deepEqual(await revoked.json(), {
    publication_id: publication.publication_id,
    version: 2,
    state: 'revoked',
  });
  assert.deepEqual(
    await fetch(`${clientBase}/api/dossiers/demo-kosmio/shared-knowledge`).then((response) =>
      response.json(),
    ),
    { items: [] },
  );

  models.revokeDossierAccess(demoSession, 'demo-kosmio', clientSession.user_id);
  const afterAccessRevocation = await fetch(
    `${clientBase}/api/dossiers/demo-kosmio/shared-knowledge`,
  );
  const unknownDossier = await fetch(`${clientBase}/api/dossiers/dossier-inconnu/shared-knowledge`);
  assert.equal(afterAccessRevocation.status, 403);
  assert.deepEqual(await afterAccessRevocation.json(), await unknownDossier.json());
});
