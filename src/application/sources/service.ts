import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type { Session } from '../../contracts/model.ts';
import type {
  AddSourceInput,
  AddSourceResult,
  ProcessingStatus,
  SourceSummary,
} from '../../contracts/source.ts';

const MAX_TEXT_BYTES = 64 * 1024;

export type SourceErrorCode =
  'ACCESS_DENIED' | 'IDEMPOTENCY_CONFLICT' | 'SOURCE_TOO_LARGE' | 'SOURCE_UNSUPPORTED';

export class SourceError extends Error {
  constructor(
    public readonly code: SourceErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export type SourceIdentity = {
  user_id: string;
  application_role: Session['application_role'] | null;
  dossiers: Array<{
    dossier_id: string;
    scopes: Array<'private' | 'shared'>;
    capabilities: Array<'read_sources' | 'write_private_sources'>;
  }>;
};

export type SourceStatus = AddSourceResult & {
  error: string | null;
  coverage: { extracted_passages: number; total_bytes: number } | null;
  passages: Array<{
    passage_id: string;
    ordinal: number;
    text: string;
    char_start: number;
    char_end: number;
  }>;
};

type AccessRow = {
  dossier_id: string;
  scope: 'private' | 'shared';
  can_write: number;
};

export class SourceService {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS sources (
        dossier_id TEXT NOT NULL,
        id TEXT NOT NULL,
        title TEXT NOT NULL,
        source_type TEXT NOT NULL,
        origin_context TEXT NOT NULL,
        source_date TEXT,
        visibility TEXT NOT NULL CHECK (visibility = 'private'),
        current_version INTEGER NOT NULL,
        processing_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY(dossier_id, id)
      );
      CREATE TABLE IF NOT EXISTS source_versions (
        dossier_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        content TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        imported_by TEXT NOT NULL,
        imported_at TEXT NOT NULL,
        PRIMARY KEY(dossier_id, source_id, version)
      );
      CREATE TABLE IF NOT EXISTS source_jobs (
        dossier_id TEXT NOT NULL,
        id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source_version INTEGER NOT NULL,
        status TEXT NOT NULL,
        error TEXT,
        extracted_passages INTEGER,
        total_bytes INTEGER,
        created_at TEXT NOT NULL,
        PRIMARY KEY(dossier_id, id)
      );
      CREATE TABLE IF NOT EXISTS source_passages (
        dossier_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source_version INTEGER NOT NULL,
        id TEXT NOT NULL,
        ordinal INTEGER NOT NULL,
        text TEXT NOT NULL,
        char_start INTEGER NOT NULL,
        char_end INTEGER NOT NULL,
        PRIMARY KEY(dossier_id, source_id, source_version, id)
      );
      CREATE TABLE IF NOT EXISTS source_imports (
        dossier_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        actor TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        result TEXT NOT NULL,
        PRIMARY KEY(dossier_id, idempotency_key)
      );`);
  }

  identity(session: Session): SourceIdentity {
    const rows = this.db
      .prepare(
        `SELECT dossier_id, scope, can_write FROM dossier_access
         WHERE user_id=? AND state='active'
         ORDER BY dossier_id, CASE scope WHEN 'private' THEN 0 ELSE 1 END`,
      )
      .all(session.user_id) as AccessRow[];
    const dossiers = new Map<string, AccessRow[]>();
    for (const row of rows)
      dossiers.set(row.dossier_id, [...(dossiers.get(row.dossier_id) ?? []), row]);
    return {
      user_id: session.user_id,
      application_role: session.application_role ?? null,
      dossiers: [...dossiers].map(([dossier_id, access]) => {
        const privateAccess = access.find((item) => item.scope === 'private');
        return {
          dossier_id,
          scopes: access.map((item) => item.scope),
          capabilities: privateAccess
            ? privateAccess.can_write
              ? ['read_sources', 'write_private_sources']
              : ['read_sources']
            : [],
        };
      }),
    };
  }

  add(session: Session, input: AddSourceInput): AddSourceResult {
    if (!['text', 'transcript'].includes(input.source_type))
      throw new SourceError('SOURCE_UNSUPPORTED', 'Type attendu : text ou transcript.');
    const totalBytes = Buffer.byteLength(input.content, 'utf8');
    if (totalBytes > MAX_TEXT_BYTES)
      throw new SourceError(
        'SOURCE_TOO_LARGE',
        `La source textuelle dépasse la limite locale de ${MAX_TEXT_BYTES} octets.`,
      );
    const payloadHash = hashPayload(input);

    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.requirePrivateAccess(session, input.dossier_id, true);
      const previous = this.db
        .prepare(
          `SELECT actor, payload_hash, result FROM source_imports
           WHERE dossier_id=? AND idempotency_key=?`,
        )
        .get(input.dossier_id, input.idempotency_key) as
        { actor: string; payload_hash: string; result: string } | undefined;
      if (previous) {
        if (previous.actor !== session.user_id || previous.payload_hash !== payloadHash)
          throw new SourceError(
            'IDEMPOTENCY_CONFLICT',
            'Cette clé a déjà été utilisée pour un autre import.',
          );
        const result = JSON.parse(previous.result) as AddSourceResult;
        this.db.exec('COMMIT');
        return result;
      }

      const sourceId = randomUUID();
      const jobId = randomUUID();
      const importedAt = new Date().toISOString();
      const passages = extractPassages(sourceId, 1, input.content);
      const result: AddSourceResult = {
        source_id: sourceId,
        version: 1,
        job_id: jobId,
        processing_status: 'completed',
        imported_at: importedAt,
      };
      this.db
        .prepare('INSERT INTO sources VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(
          input.dossier_id,
          sourceId,
          input.title,
          input.source_type,
          input.origin_context,
          input.source_date,
          'private',
          1,
          result.processing_status,
          importedAt,
        );
      this.db
        .prepare('INSERT INTO source_versions VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(
          input.dossier_id,
          sourceId,
          1,
          input.content,
          createHash('sha256').update(input.content).digest('hex'),
          session.user_id,
          importedAt,
        );
      const insertPassage = this.db.prepare(
        'INSERT INTO source_passages VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      );
      for (const passage of passages)
        insertPassage.run(
          input.dossier_id,
          sourceId,
          1,
          passage.passage_id,
          passage.ordinal,
          passage.text,
          passage.char_start,
          passage.char_end,
        );
      this.db
        .prepare('INSERT INTO source_jobs VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)')
        .run(
          input.dossier_id,
          jobId,
          sourceId,
          1,
          result.processing_status,
          passages.length,
          totalBytes,
          importedAt,
        );
      this.db
        .prepare('INSERT INTO source_imports VALUES (?, ?, ?, ?, ?)')
        .run(
          input.dossier_id,
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

  list(session: Session, dossierId: string): { items: SourceSummary[] } {
    this.requirePrivateAccess(session, dossierId, false);
    const items = this.db
      .prepare(
        `SELECT id, title, source_type, visibility, source_date, current_version, processing_status
         FROM sources WHERE dossier_id=? AND visibility='private' ORDER BY created_at, id`,
      )
      .all(dossierId) as Array<{
      id: string;
      title: string;
      source_type: AddSourceInput['source_type'];
      visibility: 'private';
      source_date: string | null;
      current_version: number;
      processing_status: ProcessingStatus;
    }>;
    return {
      items: items.map(({ id, ...item }) => ({ source_id: id, ...item })),
    };
  }

  status(session: Session, dossierId: string, sourceId: string): SourceStatus {
    this.requirePrivateAccess(session, dossierId, false);
    const row = this.db
      .prepare(
        `SELECT s.id source_id, s.current_version version, j.id job_id,
                j.status processing_status, v.imported_at, j.error,
                j.extracted_passages, j.total_bytes
         FROM sources s
         JOIN source_versions v ON v.dossier_id=s.dossier_id AND v.source_id=s.id
           AND v.version=s.current_version
         JOIN source_jobs j ON j.dossier_id=s.dossier_id AND j.source_id=s.id
           AND j.source_version=s.current_version
         WHERE s.dossier_id=? AND s.id=? AND s.visibility='private'
         ORDER BY j.created_at DESC LIMIT 1`,
      )
      .get(dossierId, sourceId) as
      | (Omit<SourceStatus, 'coverage' | 'passages'> & {
          extracted_passages: number | null;
          total_bytes: number | null;
        })
      | undefined;
    if (!row) throw denied();
    const { extracted_passages, total_bytes, ...result } = row;
    const passageRows = this.db
      .prepare(
        `SELECT id passage_id, ordinal, text, char_start, char_end
         FROM source_passages
         WHERE dossier_id=? AND source_id=? AND source_version=?
         ORDER BY ordinal`,
      )
      .all(dossierId, sourceId, result.version) as SourceStatus['passages'];
    const passages = passageRows.map((passage) => ({ ...passage }));
    return {
      ...result,
      coverage:
        extracted_passages === null || total_bytes === null
          ? null
          : { extracted_passages, total_bytes },
      passages,
    };
  }

  close() {
    this.db.close();
  }

  private requirePrivateAccess(session: Session, dossierId: string, write: boolean) {
    const row = this.db
      .prepare(
        `SELECT can_write FROM dossier_access
         WHERE dossier_id=? AND user_id=? AND scope='private' AND state='active'`,
      )
      .get(dossierId, session.user_id) as { can_write: number } | undefined;
    if (!row || (write && !row.can_write)) throw denied();
  }
}

function denied() {
  return new SourceError('ACCESS_DENIED', 'Dossier ou source indisponible pour cet accès.');
}

function hashPayload(input: AddSourceInput) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        dossier_id: input.dossier_id,
        title: input.title,
        source_type: input.source_type,
        origin_context: input.origin_context,
        source_date: input.source_date,
        content: input.content,
      }),
    )
    .digest('hex');
}

function extractPassages(sourceId: string, version: number, content: string) {
  let cursor = 0;
  return content
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((text, index) => {
      const charStart = content.indexOf(text, cursor);
      cursor = charStart + text.length;
      return {
        passage_id: `${sourceId}:v${version}:p${index + 1}`,
        ordinal: index + 1,
        text,
        char_start: charStart,
        char_end: cursor,
      };
    });
}
