import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ModelService, demoSession } from '../../src/application/model/service.ts';
import { SourceService } from '../../src/application/sources/service.ts';
import { EnrichmentService } from '../../src/application/interviews/enrichment.ts';
import { initialModel } from '../../src/adapters/persistence/seed.ts';

test('T006 / TC-014 : une source contradictoire préserve la valeur confirmée et crée une divergence sourcée', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'processia-enrichment-'));
  const path = join(directory, 'test.sqlite');
  const seed = structuredClone(initialModel);
  const task = seed.tasks.find((item) => item.id === 'task-restitution')!;
  task.details.role = {
    ids: ['role-consultant'],
    knowledge: 'confirmed',
    confirmed_by: 'responsable-demo',
    confirmed_at: '2026-09-09T10:00:00.000Z',
  };
  const models = new ModelService(path, seed);
  const sources = new SourceService(path);
  const enrichments = new EnrichmentService(path, models, sources);
  t.after(() => {
    enrichments.close();
    sources.close();
    models.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const imported = sources.add(demoSession, {
    dossier_id: 'demo-kosmio',
    idempotency_key: 'role-divergence-v1',
    title: 'Entretien synthétique',
    source_type: 'transcript',
    origin_context: 'Test déterministe T006',
    source_date: '2026-09-09',
    content: 'La direction présente le diagnostic final.',
  });
  const passage = sources.status(demoSession, 'demo-kosmio', imported.source_id).passages[0];

  const result = enrichments.proposeRole(demoSession, 'demo-kosmio', {
    model_id: 'process-diagnostic',
    task_id: 'task-restitution',
    source_id: imported.source_id,
    source_version: imported.version,
    passage_id: passage.passage_id,
    proposed_role: { role_id: 'role-direction', label: 'Direction' },
  });

  assert.equal(result.status, 'divergence');
  assert.deepEqual(result.current, {
    role_id: 'role-consultant',
    label: 'Consultant',
    knowledge: 'confirmed',
    provenance: {
      kind: 'model_revision',
      revision: 0,
      element_id: 'task-restitution',
      confirmed_by: 'responsable-demo',
      confirmed_at: '2026-09-09T10:00:00.000Z',
    },
  });
  assert.deepEqual(result.proposed.provenance, {
    kind: 'source_passage',
    source_id: imported.source_id,
    source_version: 1,
    passage_id: passage.passage_id,
  });
  assert.deepEqual(
    models
      .getModel(demoSession, 'demo-kosmio', 'process-diagnostic')
      .tasks.find((item) => item.id === 'task-restitution')!.details.role,
    task.details.role,
  );
});

test('T006 / AC-014-2 et AC-014-3 : un enrichissement compatible expose son aperçu et conserve son refus', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'processia-enrichment-'));
  const path = join(directory, 'test.sqlite');
  const models = new ModelService(path);
  const sources = new SourceService(path);
  const enrichments = new EnrichmentService(path, models, sources);
  t.after(() => {
    enrichments.close();
    sources.close();
    models.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const imported = sources.add(demoSession, {
    dossier_id: 'demo-kosmio',
    idempotency_key: 'role-compatible-v1',
    title: 'Note de rôle synthétique',
    source_type: 'text',
    origin_context: 'Test déterministe T006',
    source_date: null,
    content: 'Le responsable métier priorise les améliorations.',
  });
  const passage = sources.status(demoSession, 'demo-kosmio', imported.source_id).passages[0];
  const proposal = enrichments.proposeRole(demoSession, 'demo-kosmio', {
    model_id: 'process-diagnostic',
    task_id: 'task-priorisation',
    source_id: imported.source_id,
    source_version: 1,
    passage_id: passage.passage_id,
    proposed_role: { role_id: 'role-responsable-metier', label: 'Responsable métier' },
  });

  assert.equal(proposal.status, 'proposed');
  assert.deepEqual(proposal.preview, {
    field: 'role',
    before: { role_id: null, label: null, knowledge: 'unset' },
    after: {
      role_id: 'role-responsable-metier',
      label: 'Responsable métier',
      knowledge: 'to_confirm',
    },
  });
  const rejected = enrichments.reject(
    demoSession,
    'demo-kosmio',
    'process-diagnostic',
    proposal.enrichment_id,
    'Témoignage à recouper',
  );
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.rejection_reason, 'Témoignage à recouper');

  const nextSource = sources.add(demoSession, {
    dossier_id: 'demo-kosmio',
    idempotency_key: 'role-compatible-v2',
    title: 'Deuxième note synthétique',
    source_type: 'text',
    origin_context: 'Test déterministe T006',
    source_date: null,
    content: 'Le responsable métier anime aussi la priorisation.',
  });
  const nextPassage = sources.status(demoSession, 'demo-kosmio', nextSource.source_id).passages[0];
  const nextProposal = enrichments.proposeRole(demoSession, 'demo-kosmio', {
    model_id: 'process-diagnostic',
    task_id: 'task-priorisation',
    source_id: nextSource.source_id,
    source_version: 1,
    passage_id: nextPassage.passage_id,
    proposed_role: { role_id: 'role-responsable-metier', label: 'Responsable métier' },
  });
  const accepted = enrichments.accept(
    demoSession,
    'demo-kosmio',
    'process-diagnostic',
    nextProposal.enrichment_id,
  );
  assert.equal(accepted.status, 'accepted');
  assert.equal(accepted.applied_revision, 1);
  const enrichedTask = models
    .getModel(demoSession, 'demo-kosmio', 'process-diagnostic')
    .tasks.find((item) => item.id === 'task-priorisation')!;
  assert.equal(enrichedTask.role, 'Responsable métier');
  assert.equal(enrichedTask.details.role.knowledge, 'to_confirm');

  const history = enrichments.list(demoSession, 'demo-kosmio', 'process-diagnostic');
  assert.equal(history.items.length, 2);
  assert.equal(
    history.items.find((item) => item.enrichment_id === proposal.enrichment_id)?.rejection_reason,
    'Témoignage à recouper',
  );
});
