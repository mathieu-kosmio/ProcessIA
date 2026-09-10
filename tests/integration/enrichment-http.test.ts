import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ModelService, demoSession } from '../../src/application/model/service.ts';
import { SourceService } from '../../src/application/sources/service.ts';
import { EnrichmentService } from '../../src/application/interviews/enrichment.ts';
import { createAppServer } from '../../src/server/http.ts';

test('T006 / API : proposer, relire et refuser un enrichissement documentaire', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'processia-enrichment-http-'));
  const path = join(directory, 'test.sqlite');
  const models = new ModelService(path);
  const sources = new SourceService(path);
  const enrichments = new EnrichmentService(path, models, sources);
  const imported = sources.add(demoSession, {
    dossier_id: 'demo-kosmio',
    idempotency_key: 'http-enrichment-v1',
    title: 'Source synthétique HTTP',
    source_type: 'text',
    origin_context: 'Test HTTP T006',
    source_date: null,
    content: 'Le responsable métier priorise les améliorations.',
  });
  const passage = sources.status(demoSession, 'demo-kosmio', imported.source_id).passages[0];
  const server = createAppServer(models, undefined, demoSession, { sources, enrichments });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    enrichments.close();
    sources.close();
    models.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const collection = `${base}/api/dossiers/demo-kosmio/models/process-diagnostic/enrichments`;

  const proposedResponse = await fetch(`${collection}/role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({
      task_id: 'task-priorisation',
      source_id: imported.source_id,
      source_version: 1,
      passage_id: passage.passage_id,
      proposed_role: { role_id: 'role-responsable-metier', label: 'Responsable métier' },
    }),
  });
  assert.equal(proposedResponse.status, 201);
  const proposal = await proposedResponse.json();
  assert.equal(proposal.status, 'proposed');

  const listed = await fetch(collection).then((response) => response.json());
  assert.equal(listed.items.length, 1);
  assert.equal(listed.items[0].enrichment_id, proposal.enrichment_id);

  const rejectedResponse = await fetch(`${collection}/${proposal.enrichment_id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ reason: 'À recouper' }),
  });
  assert.equal(rejectedResponse.status, 200);
  assert.deepEqual(await rejectedResponse.json(), {
    ...proposal,
    status: 'rejected',
    rejection_reason: 'À recouper',
    reviewed_at: (await fetch(collection).then((response) => response.json())).items[0].reviewed_at,
    reviewed_by: 'local-consultant',
  });
});
