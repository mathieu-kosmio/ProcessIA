import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type { Session } from '../../contracts/model.ts';
import type { CapabilityMap, CreateCapabilityMapInput } from '../../contracts/diagnostic.ts';
import type { ModelService } from '../model/service.ts';
import type { DiagnosticService } from './service.ts';

export class CapabilityError extends Error {
  constructor(
    public readonly code: 'INVALID_CAPABILITY' | 'DIAGNOSTIC_NOT_FOUND' | 'IDEMPOTENCY_CONFLICT',
    message: string,
  ) {
    super(message);
  }
}

export class CapabilityService {
  private readonly db: DatabaseSync;

  constructor(
    path: string,
    private readonly models: ModelService,
    private readonly diagnostics: DiagnosticService,
  ) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS capability_maps (
        dossier_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY(dossier_id, model_id, id)
      );
      CREATE TABLE IF NOT EXISTS capability_commands (
        dossier_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        actor TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        result TEXT NOT NULL,
        PRIMARY KEY(dossier_id, idempotency_key)
      );`);
  }

  create(session: Session, dossierId: string, input: CreateCapabilityMapInput): CapabilityMap {
    const model = this.models.getModel(session, dossierId, input.model_id, true);
    const diagnostic = this.diagnostics
      .list(session, dossierId, input.model_id)
      .items.find((item) => item.diagnostic_id === input.diagnostic_id);
    if (!diagnostic)
      throw new CapabilityError(
        'DIAGNOSTIC_NOT_FOUND',
        'Le diagnostic de cette architecture est indisponible.',
      );
    const taskIds = new Set(model.tasks.map((task) => task.id));
    if (
      input.provider !== null ||
      input.execution !== 'disabled' ||
      !input.label.trim() ||
      !input.description.trim() ||
      input.usage_bindings.length < 2 ||
      new Set(input.usage_bindings.map((binding) => binding.usage_id)).size !==
        input.usage_bindings.length ||
      input.usage_bindings.some(
        (binding) =>
          !binding.label.trim() ||
          !binding.context.trim() ||
          binding.task_ids.length === 0 ||
          new Set(binding.task_ids).size !== binding.task_ids.length ||
          binding.task_ids.some((taskId) => !taskIds.has(taskId)),
      )
    )
      throw new CapabilityError(
        'INVALID_CAPABILITY',
        'Une capacité conceptuelle exige deux usages distincts reliés à des tâches existantes.',
      );

    const payloadHash = hash({ dossier_id: dossierId, ...input });
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const previous = this.db
        .prepare(
          `SELECT actor, payload_hash, result FROM capability_commands
           WHERE dossier_id=? AND idempotency_key=?`,
        )
        .get(dossierId, input.idempotency_key) as
        { actor: string; payload_hash: string; result: string } | undefined;
      if (previous) {
        if (previous.actor !== session.user_id || previous.payload_hash !== payloadHash)
          throw new CapabilityError(
            'IDEMPOTENCY_CONFLICT',
            'Cette clé correspond déjà à une autre architecture de capacités.',
          );
        const result = JSON.parse(previous.result) as CapabilityMap;
        this.db.exec('COMMIT');
        return result;
      }
      const createdAt = new Date().toISOString();
      const result: CapabilityMap = {
        capability_map_id: randomUUID(),
        dossier_id: dossierId,
        model_id: input.model_id,
        diagnostic_id: input.diagnostic_id,
        capability_id: input.capability_id,
        label: input.label.trim(),
        description: input.description.trim(),
        provider: null,
        execution: 'disabled',
        usage_bindings: input.usage_bindings,
        based_on_model_revision: model.revision,
        based_on_diagnostic_version: diagnostic.version,
        created_by: session.user_id,
        created_at: createdAt,
      };
      this.db
        .prepare('INSERT INTO capability_maps VALUES (?, ?, ?, ?, ?)')
        .run(
          dossierId,
          input.model_id,
          result.capability_map_id,
          JSON.stringify(result),
          createdAt,
        );
      this.db
        .prepare('INSERT INTO capability_commands VALUES (?, ?, ?, ?, ?)')
        .run(
          dossierId,
          input.idempotency_key,
          session.user_id,
          payloadHash,
          JSON.stringify(result),
        );
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  list(session: Session, dossierId: string, modelId: string): { items: CapabilityMap[] } {
    this.models.getModel(session, dossierId, modelId);
    this.diagnostics.list(session, dossierId, modelId);
    const rows = this.db
      .prepare(
        `SELECT data FROM capability_maps
         WHERE dossier_id=? AND model_id=? ORDER BY created_at, id`,
      )
      .all(dossierId, modelId) as Array<{ data: string }>;
    return { items: rows.map((row) => JSON.parse(row.data) as CapabilityMap) };
  }

  close() {
    this.db.close();
  }
}

function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
