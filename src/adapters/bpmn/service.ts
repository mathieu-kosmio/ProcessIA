import { DatabaseSync } from 'node:sqlite';
import type { ModelService } from '../../application/model/service.ts';
import type { Session } from '../../contracts/model.ts';
import type {
  BpmnCommand,
  BpmnDocument,
  BpmnResult,
  BpmnValidation,
} from '../../contracts/bpmn.ts';
import { applyBpmnCommand, validateBpmnDraft } from '../../domain/bpmn/profile.ts';
import { createBpmnDocument } from './seed.ts';

export class BpmnService {
  private db: DatabaseSync;

  constructor(
    path: string,
    private models: ModelService,
  ) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS bpmn_documents (
        dossier_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY(dossier_id, model_id)
      );
      CREATE TABLE IF NOT EXISTS bpmn_commands (
        dossier_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        command_id TEXT NOT NULL,
        actor TEXT NOT NULL,
        payload TEXT NOT NULL,
        result TEXT NOT NULL,
        PRIMARY KEY(dossier_id, model_id, command_id)
      );`);
  }

  get(session: Session, dossierId: string, modelId: string): BpmnDocument {
    const model = this.models.getModel(session, dossierId, modelId);
    let row = this.db
      .prepare('SELECT data FROM bpmn_documents WHERE dossier_id=? AND model_id=?')
      .get(dossierId, modelId) as { data: string } | undefined;
    if (!row) {
      const document = createBpmnDocument(dossierId, modelId, model.name);
      this.db
        .prepare('INSERT OR IGNORE INTO bpmn_documents VALUES (?, ?, ?)')
        .run(dossierId, modelId, JSON.stringify(document));
      row = this.db
        .prepare('SELECT data FROM bpmn_documents WHERE dossier_id=? AND model_id=?')
        .get(dossierId, modelId) as { data: string };
    }
    return JSON.parse(row.data) as BpmnDocument;
  }

  execute(session: Session, dossierId: string, modelId: string, command: BpmnCommand): BpmnResult {
    this.models.getModel(session, dossierId, modelId, true);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const previous = this.db
        .prepare(
          'SELECT actor, payload, result FROM bpmn_commands WHERE dossier_id=? AND model_id=? AND command_id=?',
        )
        .get(dossierId, modelId, command.command_id) as
        { actor: string; payload: string; result: string } | undefined;
      const payload = JSON.stringify(command);
      if (previous) {
        const result =
          previous.actor === session.user_id && previous.payload === payload
            ? (JSON.parse(previous.result) as BpmnResult)
            : {
                status: 'rejected' as const,
                code: 'IDEMPOTENCY_CONFLICT',
                message: 'Cet identifiant a déjà été utilisé pour une autre commande BPMN.',
              };
        this.db.exec('COMMIT');
        return result;
      }
      const current = this.get(session, dossierId, modelId);
      const result = applyBpmnCommand(current, command);
      if (result.status === 'applied' && result.document) {
        this.db
          .prepare('UPDATE bpmn_documents SET data=? WHERE dossier_id=? AND model_id=?')
          .run(JSON.stringify(result.document), dossierId, modelId);
        this.db
          .prepare('INSERT INTO bpmn_commands VALUES (?, ?, ?, ?, ?, ?)')
          .run(
            dossierId,
            modelId,
            command.command_id,
            session.user_id,
            payload,
            JSON.stringify(result),
          );
      }
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  validate(session: Session, dossierId: string, modelId: string): BpmnValidation {
    return validateBpmnDraft(this.get(session, dossierId, modelId));
  }

  close() {
    this.db.close();
  }
}
