import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type { Session } from '../../contracts/model.ts';
import type { CreateSharePreviewInput, PublishShareInput } from '../../contracts/sharing.ts';

export type SharingErrorCode =
  'ACCESS_DENIED' | 'IDEMPOTENCY_CONFLICT' | 'PREVIEW_INVALID' | 'VERSION_CONFLICT';

export class SharingError extends Error {
  constructor(
    public readonly code: SharingErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export type SharePreview = {
  preview_id: string;
  shared_text: string;
  source_version: number;
  state: 'preview';
  visibility: 'shared_after_confirmation';
};

export type PublishedShare = {
  publication_id: string;
  version: number;
  state: 'active';
  published_at: string;
};

type PublicationRow = {
  publication_id: string;
  text: string;
  version: number;
  published_at: string;
  source_id: string;
  source_version: number;
  passage_id: string;
};

export class SharingService {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS sharing_previews (
        dossier_id TEXT NOT NULL,
        id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source_version INTEGER NOT NULL,
        passage_id TEXT NOT NULL,
        shared_text TEXT NOT NULL,
        actor TEXT NOT NULL,
        state TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY(dossier_id, id)
      );
      CREATE TABLE IF NOT EXISTS sharing_publications (
        dossier_id TEXT NOT NULL,
        id TEXT NOT NULL,
        preview_id TEXT NOT NULL,
        text TEXT NOT NULL,
        version INTEGER NOT NULL,
        state TEXT NOT NULL,
        published_by TEXT NOT NULL,
        published_at TEXT NOT NULL,
        revoked_by TEXT,
        revoked_at TEXT,
        PRIMARY KEY(dossier_id, id)
      );
      CREATE TABLE IF NOT EXISTS sharing_events (
        dossier_id TEXT NOT NULL,
        publication_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        action TEXT NOT NULL,
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY(dossier_id, publication_id, version)
      );
      CREATE TABLE IF NOT EXISTS sharing_idempotency (
        dossier_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        actor TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        result TEXT NOT NULL,
        PRIMARY KEY(dossier_id, idempotency_key)
      );`);
  }

  preview(session: Session, dossierId: string, input: CreateSharePreviewInput): SharePreview {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.requireAccess(session, dossierId, 'private', true);
      const passage = this.db
        .prepare(
          `SELECT s.current_version, p.id FROM sources s
           JOIN source_passages p ON p.dossier_id=s.dossier_id AND p.source_id=s.id
             AND p.source_version=? AND p.id=?
           WHERE s.dossier_id=? AND s.id=? AND s.visibility='private'`,
        )
        .get(input.source_version, input.passage_id, dossierId, input.source_id) as
        { current_version: number; id: string } | undefined;
      if (!passage || passage.current_version !== input.source_version) throw invalidPreview();
      const previewId = randomUUID();
      this.db
        .prepare('INSERT INTO sharing_previews VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(
          dossierId,
          previewId,
          input.source_id,
          input.source_version,
          input.passage_id,
          input.shared_text,
          session.user_id,
          'preview',
          new Date().toISOString(),
        );
      this.db.exec('COMMIT');
      return {
        preview_id: previewId,
        shared_text: input.shared_text,
        source_version: input.source_version,
        state: 'preview',
        visibility: 'shared_after_confirmation',
      };
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  publish(session: Session, dossierId: string, input: PublishShareInput): PublishedShare {
    const payloadHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.requireAccess(session, dossierId, 'private', true);
      const previous = this.db
        .prepare(
          `SELECT actor, payload_hash, result FROM sharing_idempotency
           WHERE dossier_id=? AND idempotency_key=?`,
        )
        .get(dossierId, input.idempotency_key) as
        { actor: string; payload_hash: string; result: string } | undefined;
      if (previous) {
        if (previous.actor !== session.user_id || previous.payload_hash !== payloadHash)
          throw new SharingError(
            'IDEMPOTENCY_CONFLICT',
            'Cette clé a déjà été utilisée pour un autre partage.',
          );
        const result = JSON.parse(previous.result) as PublishedShare;
        this.db.exec('COMMIT');
        return result;
      }

      const preview = this.db
        .prepare(
          `SELECT p.source_id, p.source_version, p.shared_text, p.state, s.current_version
           FROM sharing_previews p JOIN sources s
             ON s.dossier_id=p.dossier_id AND s.id=p.source_id
           WHERE p.dossier_id=? AND p.id=?`,
        )
        .get(dossierId, input.preview_id) as
        | {
            source_id: string;
            source_version: number;
            shared_text: string;
            state: string;
            current_version: number;
          }
        | undefined;
      if (
        !preview ||
        preview.state !== 'preview' ||
        preview.source_version !== preview.current_version
      )
        throw invalidPreview();

      const publicationId = randomUUID();
      const publishedAt = new Date().toISOString();
      const result: PublishedShare = {
        publication_id: publicationId,
        version: 1,
        state: 'active',
        published_at: publishedAt,
      };
      this.db
        .prepare('INSERT INTO sharing_publications VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)')
        .run(
          dossierId,
          publicationId,
          input.preview_id,
          preview.shared_text,
          1,
          result.state,
          session.user_id,
          publishedAt,
        );
      this.db
        .prepare('UPDATE sharing_previews SET state=? WHERE dossier_id=? AND id=?')
        .run('published', dossierId, input.preview_id);
      this.db
        .prepare('INSERT INTO sharing_events VALUES (?, ?, ?, ?, ?, ?)')
        .run(dossierId, publicationId, 1, 'published', session.user_id, publishedAt);
      this.db
        .prepare('INSERT INTO sharing_idempotency VALUES (?, ?, ?, ?, ?)')
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

  list(session: Session, dossierId: string) {
    this.requireAccess(session, dossierId, 'shared', false);
    const rows = this.db
      .prepare(
        `SELECT pub.id publication_id, pub.text, pub.version, pub.published_at,
                pre.source_id, pre.source_version, pre.passage_id
         FROM sharing_publications pub JOIN sharing_previews pre
           ON pre.dossier_id=pub.dossier_id AND pre.id=pub.preview_id
         WHERE pub.dossier_id=? AND pub.state='active'
         ORDER BY pub.published_at, pub.id`,
      )
      .all(dossierId) as PublicationRow[];
    const canSeePrivate = this.hasAccess(session, dossierId, 'private', false);
    return {
      items: rows.map((row) => ({
        publication_id: row.publication_id,
        text: row.text,
        version: row.version,
        published_at: row.published_at,
        provenance: canSeePrivate
          ? this.privateProvenance(dossierId, row)
          : { kind: 'private_source' as const, details_available: false as const },
      })),
    };
  }

  revoke(session: Session, dossierId: string, publicationId: string, baseVersion: number) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.requireAccess(session, dossierId, 'private', true);
      const publication = this.db
        .prepare('SELECT version, state FROM sharing_publications WHERE dossier_id=? AND id=?')
        .get(dossierId, publicationId) as { version: number; state: string } | undefined;
      if (!publication) throw denied();
      if (publication.state !== 'active' || publication.version !== baseVersion)
        throw new SharingError(
          'VERSION_CONFLICT',
          'La publication a changé. Rechargez-la avant de retirer le partage.',
        );
      const version = publication.version + 1;
      const revokedAt = new Date().toISOString();
      this.db
        .prepare(
          `UPDATE sharing_publications SET version=?, state='revoked', revoked_by=?, revoked_at=?
           WHERE dossier_id=? AND id=?`,
        )
        .run(version, session.user_id, revokedAt, dossierId, publicationId);
      this.db
        .prepare('INSERT INTO sharing_events VALUES (?, ?, ?, ?, ?, ?)')
        .run(dossierId, publicationId, version, 'revoked', session.user_id, revokedAt);
      this.db.exec('COMMIT');
      return { publication_id: publicationId, version, state: 'revoked' as const };
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  cancelPreview(session: Session, dossierId: string, previewId: string) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.requireAccess(session, dossierId, 'private', true);
      const result = this.db
        .prepare(
          `UPDATE sharing_previews SET state='cancelled'
           WHERE dossier_id=? AND id=? AND state='preview'`,
        )
        .run(dossierId, previewId);
      if (result.changes !== 1) throw invalidPreview();
      this.db.exec('COMMIT');
      return { preview_id: previewId, state: 'cancelled' as const };
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  close() {
    this.db.close();
  }

  private privateProvenance(dossierId: string, publication: PublicationRow) {
    const row = this.db
      .prepare(
        `SELECT s.title source_title, p.text passage_text
         FROM sources s JOIN source_passages p
           ON p.dossier_id=s.dossier_id AND p.source_id=s.id
         WHERE s.dossier_id=? AND s.id=? AND p.source_version=? AND p.id=?`,
      )
      .get(dossierId, publication.source_id, publication.source_version, publication.passage_id) as
      { source_title: string; passage_text: string } | undefined;
    if (!row) throw denied();
    return {
      kind: 'private_source' as const,
      details_available: true as const,
      source_id: publication.source_id,
      source_version: publication.source_version,
      passage_id: publication.passage_id,
      source_title: row.source_title,
      passage_text: row.passage_text,
    };
  }

  private hasAccess(
    session: Session,
    dossierId: string,
    scope: 'private' | 'shared',
    write: boolean,
  ) {
    const row = this.db
      .prepare(
        `SELECT can_write FROM dossier_access
         WHERE dossier_id=? AND user_id=? AND scope=? AND state='active'`,
      )
      .get(dossierId, session.user_id, scope) as { can_write: number } | undefined;
    return Boolean(row && (!write || row.can_write));
  }

  private requireAccess(
    session: Session,
    dossierId: string,
    scope: 'private' | 'shared',
    write: boolean,
  ) {
    if (!this.hasAccess(session, dossierId, scope, write)) throw denied();
  }
}

function denied() {
  return new SharingError('ACCESS_DENIED', 'Dossier ou publication indisponible pour cet accès.');
}

function invalidPreview() {
  return new SharingError(
    'PREVIEW_INVALID',
    'La prévisualisation est absente ou obsolète. Préparez-la à nouveau.',
  );
}
