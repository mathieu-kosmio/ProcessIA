import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type { Session } from '../../contracts/model.ts';
import type {
  ConsolidateTestimoniesInput,
  InterviewInvestigation,
  TestimonyAssertion,
} from '../../contracts/interview-review.ts';
import type { ModelService } from '../model/service.ts';
import type { SourceService } from '../sources/service.ts';

export class InterviewReviewError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_TARGET'
      | 'INVALID_SOURCE_REFERENCE'
      | 'DUPLICATE_REFERENCE'
      | 'NO_DIVERGENCE'
      | 'IDEMPOTENCY_CONFLICT',
    message: string,
  ) {
    super(message);
  }
}

export class InterviewReviewService {
  private readonly db: DatabaseSync;

  constructor(
    path: string,
    private readonly models: ModelService,
    private readonly sources: SourceService,
  ) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS interview_investigations (
        dossier_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY(dossier_id, model_id, id)
      );
      CREATE TABLE IF NOT EXISTS interview_review_commands (
        dossier_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        actor TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        result TEXT NOT NULL,
        PRIMARY KEY(dossier_id, idempotency_key)
      );`);
  }

  consolidate(
    session: Session,
    dossierId: string,
    input: ConsolidateTestimoniesInput,
  ): InterviewInvestigation {
    const model = this.models.getModel(session, dossierId, input.model_id, true);
    const targetExists =
      input.subject.kind === 'task_property'
        ? model.tasks.some((task) => task.id === input.subject.element_id)
        : model.links.some((link) => link.id === input.subject.element_id);
    if (!targetExists)
      throw new InterviewReviewError(
        'INVALID_TARGET',
        'L’élément concerné par la consolidation est indisponible.',
      );
    if (input.testimonies.length < 2)
      throw new InterviewReviewError(
        'INVALID_SOURCE_REFERENCE',
        'Deux témoignages distincts sont nécessaires pour rechercher une divergence.',
      );
    const referenceKeys = input.testimonies.map(
      (item) => `${item.source_id}:${item.source_version}:${item.passage_id}`,
    );
    if (new Set(referenceKeys).size !== referenceKeys.length)
      throw new InterviewReviewError(
        'DUPLICATE_REFERENCE',
        'Un même passage ne peut pas compter comme plusieurs témoignages.',
      );

    const summaries = this.sources.list(session, dossierId).items;
    const assertions: TestimonyAssertion[] = input.testimonies.map((reference) => {
      const status = this.sources.status(session, dossierId, reference.source_id);
      const summary = summaries.find((item) => item.source_id === reference.source_id);
      const passage = status.passages.find((item) => item.passage_id === reference.passage_id);
      if (
        !summary ||
        status.version !== reference.source_version ||
        !passage ||
        summary.source_type !== 'transcript'
      )
        throw new InterviewReviewError(
          'INVALID_SOURCE_REFERENCE',
          'La transcription, sa version ou son passage est indisponible.',
        );
      return {
        assertion_id: randomUUID(),
        value: passage.text,
        knowledge: 'proposed',
        provenance: {
          ...reference,
          source_title: summary.title,
          source_date: summary.source_date,
        },
      };
    });
    const distinctValues = new Set(assertions.map((item) => normalize(item.value)));
    if (distinctValues.size < 2)
      throw new InterviewReviewError(
        'NO_DIVERGENCE',
        'Les passages sélectionnés ne décrivent pas deux versions distinctes à clarifier.',
      );

    const payloadHash = hash({ dossier_id: dossierId, ...input });
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const previous = this.db
        .prepare(
          `SELECT actor, payload_hash, result FROM interview_review_commands
           WHERE dossier_id=? AND idempotency_key=?`,
        )
        .get(dossierId, input.idempotency_key) as
        { actor: string; payload_hash: string; result: string } | undefined;
      if (previous) {
        if (previous.actor !== session.user_id || previous.payload_hash !== payloadHash)
          throw new InterviewReviewError(
            'IDEMPOTENCY_CONFLICT',
            'Cette clé correspond déjà à une autre consolidation.',
          );
        const result = JSON.parse(previous.result) as InterviewInvestigation;
        this.db.exec('COMMIT');
        return result;
      }

      const investigation: InterviewInvestigation = {
        investigation_id: randomUUID(),
        dossier_id: dossierId,
        model_id: input.model_id,
        kind: 'divergence',
        status: 'open',
        subject: input.subject,
        assertions,
        clarification: {
          target_role: input.target_role,
          target_person: null,
          question: `Dans quelles conditions la règle « ${input.subject.label} » s’applique-t-elle ?`,
          rationale: `${distinctValues.size} formulations distinctes sont conservées et demandent une clarification métier.`,
          status: 'proposed',
        },
        resolution: null,
        created_at: new Date().toISOString(),
      };
      this.db
        .prepare('INSERT INTO interview_investigations VALUES (?, ?, ?, ?, ?)')
        .run(
          dossierId,
          input.model_id,
          investigation.investigation_id,
          JSON.stringify(investigation),
          investigation.created_at,
        );
      this.db
        .prepare('INSERT INTO interview_review_commands VALUES (?, ?, ?, ?, ?)')
        .run(
          dossierId,
          input.idempotency_key,
          session.user_id,
          payloadHash,
          JSON.stringify(investigation),
        );
      this.db.exec('COMMIT');
      return investigation;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  list(session: Session, dossierId: string, modelId: string): { items: InterviewInvestigation[] } {
    this.models.getModel(session, dossierId, modelId);
    this.sources.list(session, dossierId);
    const rows = this.db
      .prepare(
        `SELECT data FROM interview_investigations
         WHERE dossier_id=? AND model_id=? ORDER BY created_at, id`,
      )
      .all(dossierId, modelId) as Array<{ data: string }>;
    return { items: rows.map((row) => JSON.parse(row.data) as InterviewInvestigation) };
  }

  close() {
    this.db.close();
  }
}

function normalize(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr');
}

function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
