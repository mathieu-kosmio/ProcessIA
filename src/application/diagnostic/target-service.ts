import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type { Session } from '../../contracts/model.ts';
import type {
  CreateTargetScenarioInput,
  TargetComparison,
  TargetScenario,
  ValidateTargetScenarioInput,
} from '../../contracts/diagnostic.ts';
import type { ModelService } from '../model/service.ts';

export class TargetScenarioError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_TARGET_CHANGE'
      | 'MODEL_CONFLICT'
      | 'TARGET_NOT_FOUND'
      | 'TARGET_CONFLICT'
      | 'IDEMPOTENCY_CONFLICT',
    message: string,
  ) {
    super(message);
  }
}

export class TargetScenarioService {
  private readonly db: DatabaseSync;

  constructor(
    path: string,
    private readonly models: ModelService,
  ) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS target_scenarios (
        dossier_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY(dossier_id, model_id, id)
      );
      CREATE TABLE IF NOT EXISTS target_scenario_commands (
        dossier_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        actor TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        result TEXT NOT NULL,
        PRIMARY KEY(dossier_id, idempotency_key)
      );`);
  }

  create(session: Session, dossierId: string, input: CreateTargetScenarioInput): TargetScenario {
    const model = this.models.getModel(session, dossierId, input.model_id, true);
    const payloadHash = hash({ operation: 'create', dossier_id: dossierId, ...input });
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const previous = this.command(dossierId, input.idempotency_key);
      if (previous) {
        this.assertReplay(previous, session, payloadHash);
        const result = JSON.parse(previous.result) as TargetScenario;
        this.db.exec('COMMIT');
        return result;
      }
      if (model.revision !== input.base_revision)
        throw new TargetScenarioError(
          'MODEL_CONFLICT',
          'La carte a changé. Rechargez-la avant de préparer la cible.',
        );
      if (
        input.changes.length === 0 ||
        new Set(input.changes.map((change) => change.change_id)).size !== input.changes.length
      )
        throw new TargetScenarioError(
          'INVALID_TARGET_CHANGE',
          'La cible exige au moins un changement identifié sans doublon.',
        );
      for (const change of input.changes) {
        const task = model.tasks.find((item) => item.id === change.task_id);
        if (
          !task ||
          task.label !== change.before_label ||
          change.after_label.trim() === change.before_label.trim()
        )
          throw new TargetScenarioError(
            'INVALID_TARGET_CHANGE',
            'Le changement doit référencer la valeur courante exacte et proposer une valeur distincte.',
          );
      }
      const createdAt = new Date().toISOString();
      const result: TargetScenario = {
        target_id: randomUUID(),
        dossier_id: dossierId,
        model_id: input.model_id,
        name: input.name,
        based_on_revision: input.base_revision,
        version: 1,
        status: 'proposed',
        changes: input.changes,
        validation: null,
        created_at: createdAt,
      };
      this.db
        .prepare('INSERT INTO target_scenarios VALUES (?, ?, ?, ?, ?)')
        .run(dossierId, input.model_id, result.target_id, JSON.stringify(result), createdAt);
      this.saveCommand(dossierId, input.idempotency_key, session, payloadHash, result);
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  validate(
    session: Session,
    dossierId: string,
    modelId: string,
    targetId: string,
    input: ValidateTargetScenarioInput,
  ): TargetScenario {
    this.models.getModel(session, dossierId, modelId, true);
    const payloadHash = hash({
      operation: 'validate',
      dossier_id: dossierId,
      model_id: modelId,
      target_id: targetId,
      ...input,
    });
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const previous = this.command(dossierId, input.idempotency_key);
      if (previous) {
        this.assertReplay(previous, session, payloadHash);
        const result = JSON.parse(previous.result) as TargetScenario;
        this.db.exec('COMMIT');
        return result;
      }
      const target = this.read(dossierId, modelId, targetId);
      if (target.version !== input.base_version || target.status !== 'proposed')
        throw new TargetScenarioError(
          'TARGET_CONFLICT',
          'La cible a changé. Rechargez-la avant de confirmer sa validation.',
        );
      const result: TargetScenario = {
        ...target,
        version: target.version + 1,
        status: 'validated',
        validation: {
          actor: session.user_id,
          application_role: session.application_role ?? null,
          justification: input.justification,
          validated_at: new Date().toISOString(),
        },
      };
      this.db
        .prepare('UPDATE target_scenarios SET data=? WHERE dossier_id=? AND model_id=? AND id=?')
        .run(JSON.stringify(result), dossierId, modelId, targetId);
      this.saveCommand(dossierId, input.idempotency_key, session, payloadHash, result);
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  compare(
    session: Session,
    dossierId: string,
    modelId: string,
    targetId: string,
  ): TargetComparison {
    const model = this.models.getModel(session, dossierId, modelId);
    const target = this.read(dossierId, modelId, targetId);
    const referenceStatus =
      model.revision === target.based_on_revision ? ('current' as const) : ('outdated' as const);
    return {
      target_id: target.target_id,
      name: target.name,
      based_on_revision: target.based_on_revision,
      current_revision: model.revision,
      reference_status: referenceStatus,
      reconciliation_required: referenceStatus === 'outdated',
      target_status: target.status,
      validation: target.validation,
      changes: target.changes.map((change) => ({
        ...change,
        reference_value: change.before_label,
        current_value: model.tasks.find((task) => task.id === change.task_id)?.label ?? null,
        target_value: change.after_label,
      })),
    };
  }

  list(session: Session, dossierId: string, modelId: string): { items: TargetComparison[] } {
    this.models.getModel(session, dossierId, modelId);
    const rows = this.db
      .prepare(
        `SELECT id FROM target_scenarios
         WHERE dossier_id=? AND model_id=? ORDER BY created_at, id`,
      )
      .all(dossierId, modelId) as Array<{ id: string }>;
    return {
      items: rows.map((row) => this.compare(session, dossierId, modelId, row.id)),
    };
  }

  close() {
    this.db.close();
  }

  private read(dossierId: string, modelId: string, targetId: string): TargetScenario {
    const row = this.db
      .prepare('SELECT data FROM target_scenarios WHERE dossier_id=? AND model_id=? AND id=?')
      .get(dossierId, modelId, targetId) as { data: string } | undefined;
    if (!row)
      throw new TargetScenarioError('TARGET_NOT_FOUND', 'Le scénario cible est indisponible.');
    return JSON.parse(row.data) as TargetScenario;
  }

  private command(dossierId: string, idempotencyKey: string) {
    return this.db
      .prepare(
        `SELECT actor, payload_hash, result FROM target_scenario_commands
         WHERE dossier_id=? AND idempotency_key=?`,
      )
      .get(dossierId, idempotencyKey) as
      { actor: string; payload_hash: string; result: string } | undefined;
  }

  private assertReplay(
    previous: { actor: string; payload_hash: string },
    session: Session,
    payloadHash: string,
  ) {
    if (previous.actor !== session.user_id || previous.payload_hash !== payloadHash)
      throw new TargetScenarioError(
        'IDEMPOTENCY_CONFLICT',
        'Cette clé correspond déjà à une autre opération de scénario cible.',
      );
  }

  private saveCommand(
    dossierId: string,
    idempotencyKey: string,
    session: Session,
    payloadHash: string,
    result: TargetScenario,
  ) {
    this.db
      .prepare('INSERT INTO target_scenario_commands VALUES (?, ?, ?, ?, ?)')
      .run(dossierId, idempotencyKey, session.user_id, payloadHash, JSON.stringify(result));
  }
}

function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
