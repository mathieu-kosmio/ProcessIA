import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type { Session } from '../../contracts/model.ts';
import type { ProposeRoleInput, RoleEnrichment, RoleSnapshot } from '../../contracts/enrichment.ts';
import type { ModelService } from '../model/service.ts';
import type { SourceService } from '../sources/service.ts';

export class EnrichmentError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_TARGET'
      | 'INVALID_SOURCE_REFERENCE'
      | 'INVALID_STATUS'
      | 'REASON_TOO_LONG'
      | 'MODEL_CONFLICT',
    message: string,
  ) {
    super(message);
  }
}

export class EnrichmentService {
  private readonly db: DatabaseSync;

  constructor(
    path: string,
    private readonly models: ModelService,
    private readonly sources: SourceService,
  ) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS enrichments (
        dossier_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY(dossier_id, model_id, id)
      );`);
  }

  proposeRole(session: Session, dossierId: string, input: ProposeRoleInput): RoleEnrichment {
    const model = this.models.getModel(session, dossierId, input.model_id, true);
    const task = model.tasks.find((item) => item.id === input.task_id);
    if (!task) throw invalidTarget();
    const source = this.sources.status(session, dossierId, input.source_id);
    const passage = source.passages.find((item) => item.passage_id === input.passage_id);
    if (source.version !== input.source_version || !passage)
      throw new EnrichmentError(
        'INVALID_SOURCE_REFERENCE',
        'La version ou le passage source est indisponible.',
      );

    const currentRoleId = task.details.role.ids[0] ?? null;
    const currentRole = currentRoleId
      ? model.roles.find((role) => role.id === currentRoleId)
      : undefined;
    const current: RoleSnapshot = {
      role_id: currentRoleId,
      label: currentRole?.label ?? null,
      knowledge: task.details.role.knowledge,
    };
    const isDivergence =
      current.knowledge === 'confirmed' && current.role_id !== input.proposed_role.role_id;
    const enrichment: RoleEnrichment = {
      enrichment_id: randomUUID(),
      dossier_id: dossierId,
      model_id: model.id,
      base_revision: model.revision,
      task_id: task.id,
      field: 'role',
      status: isDivergence ? 'divergence' : 'proposed',
      current: {
        ...current,
        provenance: {
          kind: 'model_revision',
          revision: model.revision,
          element_id: task.id,
          ...(task.details.role.confirmed_by
            ? { confirmed_by: task.details.role.confirmed_by }
            : {}),
          ...(task.details.role.confirmed_at
            ? { confirmed_at: task.details.role.confirmed_at }
            : {}),
        },
      },
      proposed: {
        ...input.proposed_role,
        knowledge: 'proposed',
        provenance: {
          kind: 'source_passage',
          source_id: input.source_id,
          source_version: input.source_version,
          passage_id: input.passage_id,
        },
      },
      preview: {
        field: 'role',
        before: current,
        after: {
          ...input.proposed_role,
          knowledge: 'to_confirm',
        },
      },
      created_at: new Date().toISOString(),
    };
    this.db
      .prepare('INSERT INTO enrichments VALUES (?, ?, ?, ?, ?)')
      .run(
        dossierId,
        model.id,
        enrichment.enrichment_id,
        JSON.stringify(enrichment),
        enrichment.created_at,
      );
    return enrichment;
  }

  reject(
    session: Session,
    dossierId: string,
    modelId: string,
    enrichmentId: string,
    reason?: string,
  ): RoleEnrichment {
    if (reason && reason.length > 1000)
      throw new EnrichmentError('REASON_TOO_LONG', 'Le motif dépasse 1 000 caractères.');
    this.models.getModel(session, dossierId, modelId, true);
    const enrichment = this.getStored(dossierId, modelId, enrichmentId);
    if (!['proposed', 'divergence'].includes(enrichment.status))
      throw new EnrichmentError('INVALID_STATUS', 'Cette proposition a déjà été examinée.');
    const rejected: RoleEnrichment = {
      ...enrichment,
      status: 'rejected',
      ...(reason?.trim() ? { rejection_reason: reason.trim() } : {}),
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.user_id,
    };
    this.db
      .prepare('UPDATE enrichments SET data=? WHERE dossier_id=? AND model_id=? AND id=?')
      .run(JSON.stringify(rejected), dossierId, enrichment.model_id, enrichmentId);
    return rejected;
  }

  accept(
    session: Session,
    dossierId: string,
    modelId: string,
    enrichmentId: string,
  ): RoleEnrichment {
    this.models.getModel(session, dossierId, modelId, true);
    const enrichment = this.getStored(dossierId, modelId, enrichmentId);
    if (enrichment.status !== 'proposed')
      throw new EnrichmentError(
        'INVALID_STATUS',
        'Une divergence doit être qualifiée avant toute modification de la carte.',
      );
    const result = this.models.execute(session, {
      schema_version: '1',
      command_id: randomUUID(),
      dossier_id: dossierId,
      model_id: enrichment.model_id,
      base_revision: enrichment.base_revision,
      origin: 'manual',
      statement: 'Enrichissement documentaire accepté',
      operations: [
        {
          type: 'UPSERT_ROLE',
          role_id: enrichment.proposed.role_id,
          label: enrichment.proposed.label,
        },
        {
          type: 'SET_TASK_ROLE',
          task_id: enrichment.task_id,
          role_id: enrichment.proposed.role_id,
          knowledge: 'to_confirm',
        },
      ],
    });
    if (result.status !== 'applied' || result.revision === undefined)
      throw new EnrichmentError(
        'MODEL_CONFLICT',
        'La carte a changé. Relisez la proposition sur la nouvelle révision.',
      );
    const accepted: RoleEnrichment = {
      ...enrichment,
      status: 'accepted',
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.user_id,
      applied_revision: result.revision,
    };
    this.db
      .prepare('UPDATE enrichments SET data=? WHERE dossier_id=? AND model_id=? AND id=?')
      .run(JSON.stringify(accepted), dossierId, enrichment.model_id, enrichmentId);
    return accepted;
  }

  list(session: Session, dossierId: string, modelId: string): { items: RoleEnrichment[] } {
    this.models.getModel(session, dossierId, modelId);
    const rows = this.db
      .prepare(
        'SELECT data FROM enrichments WHERE dossier_id=? AND model_id=? ORDER BY created_at, id',
      )
      .all(dossierId, modelId) as Array<{ data: string }>;
    return { items: rows.map((row) => JSON.parse(row.data) as RoleEnrichment) };
  }

  close() {
    this.db.close();
  }

  private getStored(dossierId: string, modelId: string, enrichmentId: string): RoleEnrichment {
    const row = this.db
      .prepare('SELECT data FROM enrichments WHERE dossier_id=? AND model_id=? AND id=?')
      .get(dossierId, modelId, enrichmentId) as { data: string } | undefined;
    if (!row) throw invalidTarget();
    return JSON.parse(row.data) as RoleEnrichment;
  }
}

function invalidTarget() {
  return new EnrichmentError('INVALID_TARGET', 'La tâche ou la proposition est indisponible.');
}
