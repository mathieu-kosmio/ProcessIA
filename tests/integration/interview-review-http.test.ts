import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ModelService, demoSession } from '../../src/application/model/service.ts';
import { SourceService } from '../../src/application/sources/service.ts';
import { InterviewReviewService } from '../../src/application/interview-review/service.ts';
import { createAppServer } from '../../src/server/http.ts';

test('T009 / HTTP : consolider puis relire une divergence d’entretiens', async (t) => {
  const path = join(mkdtempSync(join(tmpdir(), 'processia-review-http-')), 'test.sqlite');
  const models = new ModelService(path);
  const sources = new SourceService(path);
  const reviews = new InterviewReviewService(path, models, sources);
  const server = createAppServer(models, undefined, undefined, { reviews });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    reviews.close();
    sources.close();
    models.close();
  });
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const references = [
    ['review-http-1', 'Entretien direction', 'Validation systématique avant envoi.'],
    ['review-http-2', 'Entretien responsable', 'Validation seulement au-delà du seuil.'],
  ].map(([key, title, content], index) => {
    const imported = sources.add(demoSession, {
      dossier_id: 'demo-kosmio',
      idempotency_key: key,
      title,
      source_type: 'transcript',
      origin_context: 'Test HTTP synthétique',
      source_date: `2026-09-0${index + 2}`,
      content,
    });
    const passage = sources.status(demoSession, 'demo-kosmio', imported.source_id).passages[0];
    return {
      source_id: imported.source_id,
      source_version: imported.version,
      passage_id: passage.passage_id,
    };
  });
  const route = `${base}/api/dossiers/demo-kosmio/models/process-diagnostic/interview-reviews`;
  const response = await fetch(`${route}/consolidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({
      idempotency_key: 'review-http-command',
      subject: {
        kind: 'task_property',
        element_id: 'task-restitution',
        property: 'validation_rule',
        label: 'Règle de validation',
      },
      testimonies: references,
      target_role: { role_id: 'role-direction', label: 'Direction' },
    }),
  });
  assert.equal(response.status, 201);
  const investigation = await response.json();
  assert.equal(investigation.kind, 'divergence');
  assert.equal(investigation.resolution, null);

  const list = await fetch(route);
  assert.equal(list.status, 200);
  const body = await list.json();
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].investigation_id, investigation.investigation_id);

  const malformed = await fetch(`${route}/consolidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ ...investigation, user_id: 'admin' }),
  });
  assert.equal(malformed.status, 400);
});
