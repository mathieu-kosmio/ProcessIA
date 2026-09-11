import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type { Session } from '../../contracts/model.ts';
import type {
  CreateDiagnosticInput,
  CriterionAssessment,
  Diagnostic,
  RoadmapAction,
} from '../../contracts/diagnostic.ts';
import type { ModelService } from '../model/service.ts';
import type { InterviewReviewService } from '../interview-review/service.ts';

export class DiagnosticError extends Error {
  constructor(
    public readonly code:
      'INVALID_SCOPE' | 'INVALID_FINDING' | 'INVALID_OPPORTUNITY' | 'IDEMPOTENCY_CONFLICT',
    message: string,
  ) {
    super(message);
  }
}

export class DiagnosticService {
  private readonly db: DatabaseSync;

  constructor(
    path: string,
    private readonly models: ModelService,
    private readonly reviews: InterviewReviewService,
  ) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS diagnostics (
        dossier_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY(dossier_id, model_id, id)
      );
      CREATE TABLE IF NOT EXISTS diagnostic_commands (
        dossier_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        actor TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        result TEXT NOT NULL,
        PRIMARY KEY(dossier_id, idempotency_key)
      );`);
  }

  create(session: Session, dossierId: string, input: CreateDiagnosticInput): Diagnostic {
    const model = this.models.getModel(session, dossierId, input.model_id, true);
    const taskIds = new Set(model.tasks.map((task) => task.id));
    if (
      input.scope.task_ids.length === 0 ||
      new Set(input.scope.task_ids).size !== input.scope.task_ids.length ||
      input.scope.task_ids.some((id) => !taskIds.has(id))
    )
      throw new DiagnosticError(
        'INVALID_SCOPE',
        'Le périmètre doit référencer des tâches distinctes du modèle courant.',
      );
    if (
      input.finding.task_ids.length === 0 ||
      input.finding.task_ids.some((id) => !input.scope.task_ids.includes(id))
    )
      throw new DiagnosticError(
        'INVALID_FINDING',
        'Le constat doit référencer une tâche du périmètre étudié.',
      );
    const investigation = this.reviews
      .list(session, dossierId, input.model_id)
      .items.find((item) => item.investigation_id === input.finding.investigation_id);
    if (!investigation || !input.finding.task_ids.includes(investigation.subject.element_id))
      throw new DiagnosticError(
        'INVALID_FINDING',
        'Le constat et sa divergence ne sont pas cohérents.',
      );
    const ownerIsKnown =
      model.roles.some((role) => role.id === input.opportunity.human_owner.role_id) ||
      investigation.clarification.target_role.role_id === input.opportunity.human_owner.role_id;
    if (!ownerIsKnown)
      throw new DiagnosticError(
        'INVALID_OPPORTUNITY',
        'Le responsable doit référencer un rôle connu du modèle ou de la divergence.',
      );
    validateAssessment(input.opportunity.expected_value);
    validateAssessment(input.opportunity.feasibility);
    if (input.opportunity.experiment.success_criteria.length === 0)
      throw new DiagnosticError(
        'INVALID_OPPORTUNITY',
        'Une opportunité exige un critère de réussite observable.',
      );

    const payloadHash = hash({ dossier_id: dossierId, ...input });
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const previous = this.db
        .prepare(
          `SELECT actor, payload_hash, result FROM diagnostic_commands
           WHERE dossier_id=? AND idempotency_key=?`,
        )
        .get(dossierId, input.idempotency_key) as
        { actor: string; payload_hash: string; result: string } | undefined;
      if (previous) {
        if (previous.actor !== session.user_id || previous.payload_hash !== payloadHash)
          throw new DiagnosticError(
            'IDEMPOTENCY_CONFLICT',
            'Cette clé correspond déjà à un autre diagnostic.',
          );
        const result = JSON.parse(previous.result) as Diagnostic;
        this.db.exec('COMMIT');
        return result;
      }

      const prerequisiteActions: RoadmapAction[] = input.opportunity.prerequisites.map(
        (prerequisite) => ({
          action_id: randomUUID(),
          kind: 'prerequisite',
          title: prerequisite.label,
          responsible_role: input.opportunity.human_owner,
          depends_on: [],
          effort: null,
          effort_label: 'À estimer',
          exit_criteria: [prerequisite.completion_criterion],
          status: 'proposed',
        }),
      );
      const unknownCriteria = [
        input.opportunity.expected_value.value === null ? 'valeur attendue' : null,
        input.opportunity.feasibility.value === null ? 'faisabilité' : null,
      ].filter((value): value is string => value !== null);
      const result: Diagnostic = {
        diagnostic_id: randomUUID(),
        dossier_id: dossierId,
        model_id: input.model_id,
        based_on_revision: model.revision,
        status: 'draft',
        scope: input.scope,
        findings: [input.finding],
        opportunities: [
          {
            ...input.opportunity,
            finding_id: input.finding.finding_id,
            expected_value: assessment(input.opportunity.expected_value),
            feasibility: assessment(input.opportunity.feasibility),
            score: null,
            score_explanation:
              unknownCriteria.length > 0
                ? `Score indisponible : ${unknownCriteria.join(' et ')} inconnue.`
                : 'Score indisponible : méthode de priorisation à confirmer.',
            execution: 'not_started',
          },
        ],
        roadmap: {
          actions: [
            ...prerequisiteActions,
            {
              action_id: randomUUID(),
              kind: 'experiment',
              title: `Essayer : ${input.opportunity.title}`,
              responsible_role: input.opportunity.human_owner,
              depends_on: prerequisiteActions.map((action) => action.action_id),
              effort: null,
              effort_label: 'À estimer',
              exit_criteria: input.opportunity.experiment.success_criteria,
              status: 'proposed',
            },
          ],
        },
        estimated_gain: { status: 'unknown', value: null, label: 'À mesurer' },
        created_at: new Date().toISOString(),
      };
      this.db
        .prepare('INSERT INTO diagnostics VALUES (?, ?, ?, ?, ?)')
        .run(
          dossierId,
          input.model_id,
          result.diagnostic_id,
          JSON.stringify(result),
          result.created_at,
        );
      this.db
        .prepare('INSERT INTO diagnostic_commands VALUES (?, ?, ?, ?, ?)')
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

  list(session: Session, dossierId: string, modelId: string): { items: Diagnostic[] } {
    this.models.getModel(session, dossierId, modelId);
    this.reviews.list(session, dossierId, modelId);
    const rows = this.db
      .prepare(
        `SELECT data FROM diagnostics
         WHERE dossier_id=? AND model_id=? ORDER BY created_at, id`,
      )
      .all(dossierId, modelId) as Array<{ data: string }>;
    return { items: rows.map((row) => JSON.parse(row.data) as Diagnostic) };
  }

  close() {
    this.db.close();
  }
}

function validateAssessment(input: { value: number | null; confidence: string }) {
  if (
    (input.value !== null &&
      (!Number.isInteger(input.value) || input.value < 1 || input.value > 5)) ||
    (input.value === null && input.confidence !== 'unknown')
  )
    throw new DiagnosticError(
      'INVALID_OPPORTUNITY',
      'Un critère inconnu reste nul ; une valeur connue est comprise entre 1 et 5.',
    );
}

function assessment(input: {
  value: number | null;
  justification: string;
  confidence: 'unknown' | 'to_confirm' | 'confirmed';
}): CriterionAssessment {
  return {
    ...input,
    label: input.value === null ? 'Inconnue' : `${input.value}`,
  } as CriterionAssessment;
}

function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
