import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import type {
  Model,
  Session,
  CommandResult,
  HistoryEntry,
  Dossier,
  DossierSpace,
} from '../../contracts/model.ts';
import { initialModel } from '../../adapters/persistence/seed.ts';
import { commandSchema } from '../../contracts/model.ts';

const emptyReference = () => ({ ids: [], knowledge: 'unset' as const });
function legacyRoleId(label: string) {
  const slug = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `role-${slug || 'metier'}`;
}
function normalizeModel(raw: Model): Model {
  const roles = [...(raw.roles ?? [])];
  const tasks = raw.tasks.map((task) => {
    let role = task.details?.role;
    if (!role && task.role) {
      const roleId = legacyRoleId(task.role);
      if (!roles.some((item) => item.id === roleId)) roles.push({ id: roleId, label: task.role });
      role = { ids: [roleId], knowledge: 'proposed' };
    }
    return {
      ...task,
      details: task.details ?? {
        role: role ?? emptyReference(),
        tools: emptyReference(),
        inputs: emptyReference(),
        outputs: emptyReference(),
      },
    };
  });
  return {
    ...raw,
    tasks,
    roles,
    tools: raw.tools ?? [],
    information: raw.information ?? [],
  };
}

export const demoSession: Session = {
  user_id: 'local-consultant',
  application_role: 'consultant',
  grants: [{ dossier_id: 'demo-kosmio', model_id: 'process-diagnostic', write: true }],
};
export class AccessDenied extends Error {
  constructor() {
    super('ACCESS_DENIED');
  }
}
export class ModelService {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS models (dossier_id TEXT, id TEXT, data TEXT NOT NULL, PRIMARY KEY(dossier_id, id));
      CREATE TABLE IF NOT EXISTS commands (dossier_id TEXT, model_id TEXT, command_id TEXT, actor TEXT, payload TEXT, result TEXT, PRIMARY KEY(dossier_id, model_id, command_id));
      CREATE TABLE IF NOT EXISTS revisions (dossier_id TEXT, model_id TEXT, revision INTEGER, data TEXT, event TEXT, PRIMARY KEY(dossier_id, model_id, revision));`);
    this.db.exec(`CREATE TABLE IF NOT EXISTS dossiers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, activity TEXT, state TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS dossier_access (
      dossier_id TEXT NOT NULL, user_id TEXT NOT NULL, application_role TEXT NOT NULL,
      scope TEXT NOT NULL, can_write INTEGER NOT NULL, state TEXT NOT NULL,
      PRIMARY KEY(dossier_id, user_id, scope),
      FOREIGN KEY(dossier_id) REFERENCES dossiers(id)
    );`);
    this.db
      .prepare('INSERT OR IGNORE INTO dossiers VALUES (?, ?, ?, ?, ?)')
      .run('demo-kosmio', 'Kosmio', null, 'active', new Date().toISOString());
    const seedAccess = this.db.prepare(
      'INSERT OR IGNORE INTO dossier_access VALUES (?, ?, ?, ?, ?, ?)',
    );
    seedAccess.run('demo-kosmio', demoSession.user_id, 'consultant', 'private', 1, 'active');
    seedAccess.run('demo-kosmio', demoSession.user_id, 'consultant', 'shared', 1, 'active');
    this.db
      .prepare('INSERT OR IGNORE INTO models VALUES (?, ?, ?)')
      .run(initialModel.dossier_id, initialModel.id, JSON.stringify(initialModel));
    this.db
      .prepare('INSERT OR IGNORE INTO revisions VALUES (?, ?, 0, ?, NULL)')
      .run(initialModel.dossier_id, initialModel.id, JSON.stringify(initialModel));
  }
  execute(session: Session, input: unknown): CommandResult {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = this.apply(session, input);
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  private apply(session: Session, input: unknown): CommandResult {
    const parsed = commandSchema.safeParse(input);
    const rejected = (): CommandResult => ({
      status: 'rejected',
      code: 'INVALID_OPERATION',
      message: 'La commande contient un champ ou une cible invalide. Aucun changement enregistré.',
      warnings: [],
      correlation_id: randomUUID(),
    });
    if (!parsed.success) return rejected();
    const command = parsed.data;
    if (!this.modelAllowed(session, command.dossier_id, command.model_id, true))
      return {
        ...rejected(),
        code: 'ACCESS_DENIED',
        message: 'Dossier indisponible pour cet accès.',
      };
    let model = this.getModel(session, command.dossier_id, command.model_id);
    const previous = this.db
      .prepare(
        'SELECT actor, payload, result FROM commands WHERE dossier_id=? AND model_id=? AND command_id=?',
      )
      .get(command.dossier_id, command.model_id, command.command_id) as
      { actor: string; payload: string; result: string } | undefined;
    if (previous) {
      if (previous.actor !== session.user_id || previous.payload !== JSON.stringify(command))
        return {
          ...rejected(),
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'Cet identifiant a déjà été utilisé pour une autre commande.',
        };
      return { ...JSON.parse(previous.result), status: 'duplicate', correlation_id: randomUUID() };
    }
    if (model.revision !== command.base_revision)
      return {
        status: 'conflict',
        code: 'REVISION_CONFLICT',
        revision: model.revision,
        message: 'La carte a changé. Rechargez-la et revoyez votre modification.',
        warnings: [],
        correlation_id: randomUUID(),
      };
    if (
      command.selection_snapshot &&
      (command.selection_snapshot.revision !== command.base_revision ||
        !model.tasks.some((task) => task.id === command.selection_snapshot?.element_id))
    )
      return rejected();
    for (const operation of command.operations) {
      if (operation.type === 'UNDO') {
        const latest = this.getHistory(session, model.dossier_id, model.id)[0];
        if (
          command.operations.length !== 1 ||
          !latest ||
          latest.command_id !== operation.target_command_id
        )
          return rejected();
        const row = this.db
          .prepare('SELECT data FROM revisions WHERE dossier_id=? AND model_id=? AND revision=?')
          .get(model.dossier_id, model.id, model.revision - 1) as { data: string };
        model = normalizeModel({ ...JSON.parse(row.data), revision: model.revision });
        continue;
      }
      if (operation.type === 'MOVE_ELEMENT' || operation.type === 'UPDATE_LABEL') {
        const task = model.tasks.find((task) => task.id === operation.element_id);
        if (operation.type === 'MOVE_ELEMENT') {
          if (!task) return rejected();
          task.position = operation.position;
          continue;
        }
        if (task) {
          task.label = operation.label;
          continue;
        }
        const role = model.roles.find((item) => item.id === operation.element_id);
        const tool = model.tools.find((item) => item.id === operation.element_id);
        const information = model.information.find((item) => item.id === operation.element_id);
        const entity = role ?? tool ?? information;
        if (!entity) return rejected();
        entity.label = operation.label;
        if (role)
          model.tasks.forEach((item) => {
            if (item.details.role.ids.includes(role.id)) item.role = role.label;
          });
        continue;
      }
      if (
        operation.type === 'UPSERT_ROLE' ||
        operation.type === 'UPSERT_TOOL' ||
        operation.type === 'UPSERT_INFORMATION'
      ) {
        const entityId =
          operation.type === 'UPSERT_ROLE'
            ? operation.role_id
            : operation.type === 'UPSERT_TOOL'
              ? operation.tool_id
              : operation.information_id;
        const usedByAnotherKind =
          model.tasks.some((item) => item.id === entityId) ||
          (operation.type !== 'UPSERT_ROLE' && model.roles.some((item) => item.id === entityId)) ||
          (operation.type !== 'UPSERT_TOOL' && model.tools.some((item) => item.id === entityId)) ||
          (operation.type !== 'UPSERT_INFORMATION' &&
            model.information.some((item) => item.id === entityId));
        if (usedByAnotherKind) return rejected();
        if (operation.type === 'UPSERT_ROLE') {
          const existing = model.roles.find((item) => item.id === operation.role_id);
          if (existing) {
            existing.label = operation.label;
            model.tasks.forEach((item) => {
              if (item.details.role.ids.includes(existing.id)) item.role = existing.label;
            });
          } else model.roles.push({ id: operation.role_id, label: operation.label });
        } else if (operation.type === 'UPSERT_TOOL') {
          const existing = model.tools.find((item) => item.id === operation.tool_id);
          if (existing) existing.label = operation.label;
          else model.tools.push({ id: operation.tool_id, label: operation.label });
        } else {
          const existing = model.information.find((item) => item.id === operation.information_id);
          if (existing && existing.category !== operation.category) return rejected();
          if (existing) existing.label = operation.label;
          else
            model.information.push({
              id: operation.information_id,
              label: operation.label,
              category: operation.category,
            });
        }
        continue;
      }
      if (
        operation.type === 'SET_TASK_ROLE' ||
        operation.type === 'SET_TASK_TOOL' ||
        operation.type === 'LINK_INFORMATION'
      ) {
        const task = model.tasks.find((item) => item.id === operation.task_id);
        if (!task) return rejected();
        if (operation.type === 'SET_TASK_ROLE') {
          const ids = operation.role_id ? [operation.role_id] : [];
          const role = operation.role_id
            ? model.roles.find((item) => item.id === operation.role_id)
            : undefined;
          if (!role && operation.role_id) return rejected();
          if ((ids.length === 0) !== (operation.knowledge === 'unset')) return rejected();
          task.details.role = { ids, knowledge: operation.knowledge };
          task.role = role?.label ?? null;
        } else if (operation.type === 'SET_TASK_TOOL') {
          if (new Set(operation.tool_ids).size !== operation.tool_ids.length) return rejected();
          if (operation.tool_ids.some((id) => !model.tools.some((item) => item.id === id)))
            return rejected();
          if ((operation.tool_ids.length === 0) !== (operation.knowledge === 'unset'))
            return rejected();
          task.details.tools = { ids: operation.tool_ids, knowledge: operation.knowledge };
        } else {
          if (new Set(operation.information_ids).size !== operation.information_ids.length)
            return rejected();
          if (
            operation.information_ids.some(
              (id) => !model.information.some((item) => item.id === id),
            )
          )
            return rejected();
          if ((operation.information_ids.length === 0) !== (operation.knowledge === 'unset'))
            return rejected();
          task.details[operation.direction === 'input' ? 'inputs' : 'outputs'] = {
            ids: operation.information_ids,
            knowledge: operation.knowledge,
          };
        }
        continue;
      }
      const target = model.tasks.find((task) => task.id === operation.before_id);
      if (
        model.tasks.some((task) => task.id === operation.task_id) ||
        (operation.before_id && !target)
      )
        return rejected();
      const position = { x: target?.position.x ?? 70, y: (target?.position.y ?? 400) - 160 };
      while (
        model.tasks.some(
          (task) =>
            Math.abs(task.position.x - position.x) < 280 &&
            Math.abs(task.position.y - position.y) < 150,
        )
      )
        position.y -= 160;
      model.tasks.push({
        id: operation.task_id,
        label: operation.label,
        position,
        knowledge: 'proposed',
        role: null,
        details: {
          role: emptyReference(),
          tools: emptyReference(),
          inputs: emptyReference(),
          outputs: emptyReference(),
        },
      });
      if (target) {
        model.links = model.links.map((link) =>
          link.target === target.id ? { ...link, target: operation.task_id } : link,
        );
        model.links.push({
          id: randomUUID(),
          source: operation.task_id,
          target: target.id,
          type: 'sequence',
        });
      }
    }
    model.revision += 1;
    this.db
      .prepare('UPDATE models SET data=? WHERE dossier_id=? AND id=?')
      .run(JSON.stringify(model), model.dossier_id, model.id);
    const result: CommandResult = {
      status: 'applied',
      revision: model.revision,
      applied_command_id: command.command_id,
      changes: command.operations.flatMap((operation) => {
        if (operation.type === 'UNDO') return model.tasks.map((task) => task.id);
        if (operation.type === 'ADD_TASK') return [operation.task_id];
        if (operation.type === 'UPDATE_LABEL' || operation.type === 'MOVE_ELEMENT')
          return [operation.element_id];
        if (operation.type === 'UPSERT_ROLE') return [operation.role_id];
        if (operation.type === 'UPSERT_TOOL') return [operation.tool_id];
        if (operation.type === 'UPSERT_INFORMATION') return [operation.information_id];
        return [operation.task_id];
      }),
      warnings: [],
      correlation_id: randomUUID(),
    };
    this.db
      .prepare('INSERT INTO commands VALUES (?, ?, ?, ?, ?, ?)')
      .run(
        model.dossier_id,
        model.id,
        command.command_id,
        session.user_id,
        JSON.stringify(command),
        JSON.stringify(result),
      );
    const event: HistoryEntry = {
      revision: model.revision,
      command_id: command.command_id,
      actor: session.user_id,
      origin: command.origin,
      statement: command.statement,
      created_at: new Date().toISOString(),
      operations: command.operations,
    };
    this.db
      .prepare('INSERT INTO revisions VALUES (?, ?, ?, ?, ?)')
      .run(
        model.dossier_id,
        model.id,
        model.revision,
        JSON.stringify(model),
        JSON.stringify(event),
      );
    return result;
  }
  getModel(session: Session, dossier: string, model: string, requireWrite = false): Model {
    if (!this.modelAllowed(session, dossier, model, requireWrite)) throw new AccessDenied();
    const row = this.db
      .prepare('SELECT data FROM models WHERE dossier_id=? AND id=?')
      .get(dossier, model) as { data: string } | undefined;
    if (!row) throw new AccessDenied();
    return normalizeModel(JSON.parse(row.data));
  }

  private modelAllowed(session: Session, dossierId: string, modelId: string, write: boolean) {
    const access = this.db
      .prepare(
        `SELECT a.can_write FROM models m
         JOIN dossier_access a ON a.dossier_id=m.dossier_id AND a.scope=json_extract(m.data, '$.visibility')
         WHERE m.dossier_id=? AND m.id=? AND a.user_id=? AND a.state='active'`,
      )
      .get(dossierId, modelId, session.user_id) as { can_write: number } | undefined;
    if (!access || (write && !access.can_write)) return false;
    const sessionGrant = session.grants.find(
      (grant) => grant.dossier_id === dossierId && grant.model_id === modelId,
    );
    return sessionGrant ? !write || sessionGrant.write : true;
  }
  close() {
    this.db.close();
  }
  getHistory(session: Session, dossier: string, model: string): HistoryEntry[] {
    this.getModel(session, dossier, model);
    return (
      this.db
        .prepare(
          'SELECT event FROM revisions WHERE dossier_id=? AND model_id=? AND event IS NOT NULL ORDER BY revision DESC',
        )
        .all(dossier, model) as { event: string }[]
    ).map((row) => JSON.parse(row.event));
  }

  createDossier(session: Session, input: { name: string; activity: string | null }): Dossier {
    if (session.application_role !== 'consultant') throw new AccessDenied();
    const dossierId = randomUUID();
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db
        .prepare('INSERT INTO dossiers VALUES (?, ?, ?, ?, ?)')
        .run(dossierId, input.name, input.activity, 'active', new Date().toISOString());
      const insertAccess = this.db.prepare('INSERT INTO dossier_access VALUES (?, ?, ?, ?, ?, ?)');
      insertAccess.run(dossierId, session.user_id, 'consultant', 'private', 1, 'active');
      insertAccess.run(dossierId, session.user_id, 'consultant', 'shared', 1, 'active');
      const model: Model = {
        id: 'process-diagnostic',
        dossier_id: dossierId,
        name: 'Carte de travail',
        revision: 0,
        visibility: 'private',
        tasks: [],
        links: [],
        roles: [],
        tools: [],
        information: [],
      };
      this.db
        .prepare('INSERT INTO models VALUES (?, ?, ?)')
        .run(dossierId, model.id, JSON.stringify(model));
      this.db
        .prepare('INSERT INTO revisions VALUES (?, ?, 0, ?, NULL)')
        .run(dossierId, model.id, JSON.stringify(model));
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return this.getDossier(session, dossierId);
  }

  getDossier(session: Session, dossierId: string): Dossier {
    const row = this.db
      .prepare(
        `SELECT d.id, d.name, d.activity, d.state, a.scope
         FROM dossiers d JOIN dossier_access a ON a.dossier_id=d.id
         WHERE d.id=? AND a.user_id=? AND a.state='active'
         ORDER BY CASE a.scope WHEN 'private' THEN 0 ELSE 1 END`,
      )
      .all(dossierId, session.user_id) as Array<{
      id: string;
      name: string;
      activity: string | null;
      state: 'active';
      scope: DossierSpace;
    }>;
    if (row.length === 0) throw new AccessDenied();
    return {
      id: row[0].id,
      name: row[0].name,
      activity: row[0].activity,
      state: row[0].state,
      available_spaces: row.map((entry) => entry.scope),
    };
  }

  listDossiers(session: Session): { items: Dossier[] } {
    const ids = this.db
      .prepare(
        `SELECT DISTINCT d.id, d.created_at
         FROM dossiers d JOIN dossier_access a ON a.dossier_id=d.id
         WHERE a.user_id=? AND a.state='active'
         ORDER BY d.created_at, d.id`,
      )
      .all(session.user_id) as Array<{ id: string }>;
    return { items: ids.map(({ id }) => this.getDossier(session, id)) };
  }

  grantDossierAccess(
    session: Session,
    dossierId: string,
    userId: string,
    role: 'consultant' | 'responsable',
    scope: DossierSpace,
    canWrite = role === 'consultant',
  ) {
    const grantor = this.db
      .prepare(
        `SELECT can_write FROM dossier_access
         WHERE dossier_id=? AND user_id=? AND scope='private' AND state='active'`,
      )
      .get(dossierId, session.user_id) as { can_write: number } | undefined;
    if (!grantor?.can_write || (role === 'responsable' && scope !== 'shared'))
      throw new AccessDenied();
    this.db
      .prepare('INSERT OR REPLACE INTO dossier_access VALUES (?, ?, ?, ?, ?, ?)')
      .run(dossierId, userId, role, scope, canWrite ? 1 : 0, 'active');
  }

  revokeDossierAccess(session: Session, dossierId: string, userId: string) {
    const grantor = this.db
      .prepare(
        `SELECT can_write FROM dossier_access
         WHERE dossier_id=? AND user_id=? AND scope='private' AND state='active'`,
      )
      .get(dossierId, session.user_id) as { can_write: number } | undefined;
    if (!grantor?.can_write) throw new AccessDenied();
    this.db
      .prepare(`UPDATE dossier_access SET state='revoked' WHERE dossier_id=? AND user_id=?`)
      .run(dossierId, userId);
  }
}
