import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type { Session } from '../../contracts/model.ts';
import type {
  AddInterviewTurnInput,
  InterviewMessage,
  InterviewMode,
  InterviewSession,
  StartInterviewInput,
} from '../../contracts/interview.ts';
import type { ModelService } from '../model/service.ts';

export class InterviewError extends Error {
  constructor(
    public readonly code:
      | 'INTERVIEW_NOT_FOUND'
      | 'VOICE_CONSENT_REQUIRED'
      | 'INVALID_MESSAGE'
      | 'IDEMPOTENCY_CONFLICT'
      | 'NO_RESPONSE_TO_INTERRUPT'
      | 'TRANSCRIPTION_REQUIRED',
    message: string,
  ) {
    super(message);
  }
}

export class InterviewService {
  private readonly db: DatabaseSync;

  constructor(
    path: string,
    private readonly models: ModelService,
  ) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS interviews (
        dossier_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        id TEXT NOT NULL,
        actor TEXT NOT NULL,
        status TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY(dossier_id, model_id, id)
      );
      CREATE TABLE IF NOT EXISTS interview_turn_keys (
        interview_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        actor TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        message_id TEXT NOT NULL,
        PRIMARY KEY(interview_id, idempotency_key)
      );`);
    this.clearSessionScoped();
  }

  start(session: Session, input: StartInterviewInput): InterviewSession {
    this.models.getModel(session, input.dossier_id, input.model_id, true);
    const existing = this.db
      .prepare(
        `SELECT data FROM interviews
         WHERE dossier_id=? AND model_id=? AND actor=? AND status='active'
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get(input.dossier_id, input.model_id, session.user_id) as { data: string } | undefined;
    if (existing) return JSON.parse(existing.data) as InterviewSession;
    const now = new Date().toISOString();
    const interview: InterviewSession = {
      interview_id: randomUUID(),
      dossier_id: input.dossier_id,
      model_id: input.model_id,
      actor: session.user_id,
      status: 'active',
      mode: 'text',
      voice_state: 'ready',
      voice_consent: 'pending',
      transcription_policy: input.transcription_policy,
      audio_persisted: false,
      messages: [],
      created_at: now,
      updated_at: now,
    };
    this.db
      .prepare('INSERT INTO interviews VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(
        interview.dossier_id,
        interview.model_id,
        interview.interview_id,
        interview.actor,
        interview.status,
        JSON.stringify(interview),
        now,
        now,
      );
    return interview;
  }

  get(session: Session, interviewId: string): InterviewSession {
    const interview = this.load(interviewId);
    this.models.getModel(session, interview.dossier_id, interview.model_id);
    if (interview.actor !== session.user_id) throw missing();
    return interview;
  }

  setVoiceConsent(session: Session, interviewId: string, granted: boolean): InterviewSession {
    return this.update(session, interviewId, (interview) => ({
      ...interview,
      voice_consent: granted ? 'granted' : 'refused',
      mode: granted ? interview.mode : 'text',
      voice_state: granted ? 'ready' : 'paused',
    }));
  }

  switchMode(session: Session, interviewId: string, mode: InterviewMode): InterviewSession {
    return this.update(session, interviewId, (interview) => ({
      ...interview,
      mode,
      voice_state: mode === 'text' ? 'paused' : 'ready',
    }));
  }

  listen(session: Session, interviewId: string): InterviewSession {
    return this.update(session, interviewId, (interview) => {
      if (interview.voice_consent !== 'granted')
        throw new InterviewError(
          'VOICE_CONSENT_REQUIRED',
          'L’activation du microphone doit être choisie explicitement.',
        );
      return { ...interview, mode: 'voice', voice_state: 'listening' };
    });
  }

  pause(session: Session, interviewId: string): InterviewSession {
    return this.update(session, interviewId, (interview) => ({
      ...interview,
      voice_state: 'paused',
    }));
  }

  addTurn(session: Session, interviewId: string, input: AddInterviewTurnInput): InterviewMessage {
    const interview = this.get(session, interviewId);
    const payloadHash = hash(input);
    const previous = this.db
      .prepare(
        'SELECT actor, payload_hash, message_id FROM interview_turn_keys WHERE interview_id=? AND idempotency_key=?',
      )
      .get(interviewId, input.idempotency_key) as
      { actor: string; payload_hash: string; message_id: string } | undefined;
    if (previous) {
      if (previous.actor !== session.user_id || previous.payload_hash !== payloadHash)
        throw new InterviewError(
          'IDEMPOTENCY_CONFLICT',
          'Cette clé correspond déjà à un autre tour.',
        );
      return interview.messages.find((message) => message.message_id === previous.message_id)!;
    }
    if (!input.text.trim() || input.text.length > 2000)
      throw new InterviewError(
        'INVALID_MESSAGE',
        'Le message doit contenir entre 1 et 2 000 caractères.',
      );
    if (input.mode === 'voice' && interview.voice_consent !== 'granted')
      throw new InterviewError(
        'VOICE_CONSENT_REQUIRED',
        'Le traitement vocal n’est pas autorisé pour cet entretien.',
      );
    if (input.mode === 'voice' && interview.transcription_policy === 'none')
      throw new InterviewError(
        'TRANSCRIPTION_REQUIRED',
        'Cet entretien reste disponible en saisie manuelle sans transcription conservée.',
      );
    if (
      input.selection_snapshot &&
      !this.models
        .getModel(session, interview.dossier_id, interview.model_id)
        .tasks.some((task) => task.id === input.selection_snapshot?.element_id)
    )
      throw new InterviewError('INVALID_MESSAGE', 'La sélection associée est indisponible.');
    const message: InterviewMessage = {
      message_id: randomUUID(),
      sequence: interview.messages.length + 1,
      role: 'user',
      mode: input.mode,
      text: input.text.trim(),
      status: 'final',
      ...(input.selection_snapshot ? { selection_snapshot: input.selection_snapshot } : {}),
      created_at: new Date().toISOString(),
    };
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.save({
        ...interview,
        mode: input.mode,
        voice_state: input.mode === 'voice' ? 'processing' : 'paused',
        messages: [...interview.messages, message],
      });
      this.db
        .prepare('INSERT INTO interview_turn_keys VALUES (?, ?, ?, ?, ?)')
        .run(interviewId, input.idempotency_key, session.user_id, payloadHash, message.message_id);
      this.db.exec('COMMIT');
      return message;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  beginResponse(session: Session, interviewId: string, text: string): InterviewMessage {
    if (!text.trim()) throw new InterviewError('INVALID_MESSAGE', 'La réponse est vide.');
    let response!: InterviewMessage;
    this.update(session, interviewId, (interview) => {
      response = {
        message_id: randomUUID(),
        sequence: interview.messages.length + 1,
        role: 'assistant',
        mode: interview.mode,
        text: text.trim(),
        status: 'streaming',
        created_at: new Date().toISOString(),
      };
      return {
        ...interview,
        voice_state: 'responding',
        messages: [...interview.messages, response],
      };
    });
    return response;
  }

  interrupt(session: Session, interviewId: string): InterviewSession {
    return this.update(session, interviewId, (interview) => {
      const index = interview.messages.findLastIndex(
        (message) => message.role === 'assistant' && message.status === 'streaming',
      );
      if (index < 0)
        throw new InterviewError(
          'NO_RESPONSE_TO_INTERRUPT',
          'Aucune réponse en cours ne peut être interrompue.',
        );
      const messages = interview.messages.map((message, messageIndex) =>
        messageIndex === index ? { ...message, status: 'interrupted' as const } : message,
      );
      return { ...interview, voice_state: 'ready', messages };
    });
  }

  correctTranscript(
    session: Session,
    interviewId: string,
    messageId: string,
    correctedText: string,
  ): InterviewMessage {
    if (!correctedText.trim() || correctedText.length > 2000)
      throw new InterviewError('INVALID_MESSAGE', 'La correction est invalide.');
    let corrected!: InterviewMessage;
    this.update(session, interviewId, (interview) => {
      const message = interview.messages.find((item) => item.message_id === messageId);
      if (!message || message.role !== 'user' || message.mode !== 'voice') throw missing();
      corrected = {
        ...message,
        text: correctedText.trim(),
        corrections: [
          ...(message.corrections ?? []),
          {
            previous_text: message.text,
            corrected_text: correctedText.trim(),
            corrected_by: session.user_id,
            corrected_at: new Date().toISOString(),
          },
        ],
      };
      return {
        ...interview,
        messages: interview.messages.map((item) =>
          item.message_id === messageId ? corrected : item,
        ),
      };
    });
    return corrected;
  }

  close() {
    this.clearSessionScoped();
    this.db.close();
  }

  private clearSessionScoped() {
    const sessionIds = this.db
      .prepare(
        `SELECT id FROM interviews
         WHERE json_extract(data, '$.transcription_policy')='session'`,
      )
      .all() as Array<{ id: string }>;
    const removeKeys = this.db.prepare('DELETE FROM interview_turn_keys WHERE interview_id=?');
    for (const { id } of sessionIds) removeKeys.run(id);
    this.db
      .prepare(
        "DELETE FROM interviews WHERE json_extract(data, '$.transcription_policy')='session'",
      )
      .run();
  }

  private update(
    session: Session,
    interviewId: string,
    change: (interview: InterviewSession) => InterviewSession,
  ): InterviewSession {
    const current = this.get(session, interviewId);
    const updated = change(current);
    this.save(updated);
    return this.get(session, interviewId);
  }

  private save(interview: InterviewSession) {
    const updated = { ...interview, updated_at: new Date().toISOString() };
    this.db
      .prepare(
        'UPDATE interviews SET status=?, data=?, updated_at=? WHERE dossier_id=? AND model_id=? AND id=?',
      )
      .run(
        updated.status,
        JSON.stringify(updated),
        updated.updated_at,
        updated.dossier_id,
        updated.model_id,
        updated.interview_id,
      );
  }

  private load(interviewId: string): InterviewSession {
    const row = this.db.prepare('SELECT data FROM interviews WHERE id=?').get(interviewId) as
      { data: string } | undefined;
    if (!row) throw missing();
    return JSON.parse(row.data) as InterviewSession;
  }
}

function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function missing() {
  return new InterviewError('INTERVIEW_NOT_FOUND', 'Entretien indisponible pour cet accès.');
}
