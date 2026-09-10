import { useEffect, useState } from 'react';
import type {
  Model,
  Command,
  CommandResult,
  HistoryEntry,
  Dossier,
  Task,
} from '../../contracts/model.ts';
import type { Proposal } from '../../application/interviews/propose.ts';
import { Canvas } from './Canvas.tsx';
import { TaskInspector, type TaskDetailValues } from './TaskInspector.tsx';
import { CreateDossierDialog } from './CreateDossierDialog.tsx';
import { SharingPanel } from '../sharing/SharingPanel.tsx';

const modelPath = (dossierId: string) => `/api/dossiers/${dossierId}/models/process-diagnostic`;
async function read<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error('La carte est momentanément indisponible. Réessayez.');
  return response.json();
}
async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok && !data.status) throw new Error(data.message ?? 'La demande a échoué.');
  return data;
}

function taskDetailValues(model: Model, task: Task): TaskDetailValues {
  const labels = <T extends { id: string; label: string }>(ids: string[], items: T[]) =>
    ids
      .map((id) => items.find((item) => item.id === id)?.label)
      .filter(Boolean)
      .join(', ');
  return {
    role: labels(task.details.role.ids, model.roles),
    tool: labels(task.details.tools.ids, model.tools),
    input: labels(task.details.inputs.ids, model.information),
    output: labels(task.details.outputs.ids, model.information),
  };
}

function taskDetailOperations(
  model: Model,
  task: Task,
  values: TaskDetailValues,
): Command['operations'] {
  const operations: Command['operations'] = [];
  const [roleLabel, toolLabel, inputLabel, outputLabel] = [
    values.role,
    values.tool,
    values.input,
    values.output,
  ].map((value) => value.trim());
  const sameLabel = (left: string, right: string) =>
    left.toLocaleLowerCase('fr') === right.toLocaleLowerCase('fr');
  const role = roleLabel ? model.roles.find((item) => sameLabel(item.label, roleLabel)) : undefined;
  const tool = toolLabel ? model.tools.find((item) => sameLabel(item.label, toolLabel)) : undefined;
  const input = inputLabel
    ? model.information.find(
        (item) => item.category === 'data' && sameLabel(item.label, inputLabel),
      )
    : undefined;
  const output = outputLabel
    ? model.information.find(
        (item) => item.category === 'deliverable' && sameLabel(item.label, outputLabel),
      )
    : undefined;
  const roleId = roleLabel ? (role?.id ?? `role-${crypto.randomUUID()}`) : null;
  const toolId = toolLabel ? (tool?.id ?? `tool-${crypto.randomUUID()}`) : null;
  const inputId = inputLabel ? (input?.id ?? `information-${crypto.randomUUID()}`) : null;
  const outputId = outputLabel ? (output?.id ?? `information-${crypto.randomUUID()}`) : null;
  if (roleLabel && !role)
    operations.push({ type: 'UPSERT_ROLE', role_id: roleId!, label: roleLabel });
  if (toolLabel && !tool)
    operations.push({ type: 'UPSERT_TOOL', tool_id: toolId!, label: toolLabel });
  if (inputLabel && !input)
    operations.push({
      type: 'UPSERT_INFORMATION',
      information_id: inputId!,
      label: inputLabel,
      category: 'data',
    });
  if (outputLabel && !output)
    operations.push({
      type: 'UPSERT_INFORMATION',
      information_id: outputId!,
      label: outputLabel,
      category: 'deliverable',
    });
  operations.push(
    {
      type: 'SET_TASK_ROLE',
      task_id: task.id,
      role_id: roleId,
      knowledge: roleId ? 'to_confirm' : 'unset',
    },
    {
      type: 'SET_TASK_TOOL',
      task_id: task.id,
      tool_ids: toolId ? [toolId] : [],
      knowledge: toolId ? 'to_confirm' : 'unset',
    },
    {
      type: 'LINK_INFORMATION',
      task_id: task.id,
      direction: 'input',
      information_ids: inputId ? [inputId] : [],
      knowledge: inputId ? 'to_confirm' : 'unset',
    },
    {
      type: 'LINK_INFORMATION',
      task_id: task.id,
      direction: 'output',
      information_ids: outputId ? [outputId] : [],
      knowledge: outputId ? 'to_confirm' : 'unset',
    },
  );
  return operations;
}

export function Studio() {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [activeDossier, setActiveDossier] = useState('demo-kosmio');
  const [showCreate, setShowCreate] = useState(false);
  const [model, setModel] = useState<Model>();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selected, setSelected] = useState<string>();
  const [view, setView] = useState<'map' | 'list'>('map');
  const [showHistory, setShowHistory] = useState(false);
  const [showSharing, setShowSharing] = useState(false);
  const [text, setText] = useState('');
  const [proposal, setProposal] = useState<Proposal>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  async function refresh(dossierId = activeDossier) {
    const path = modelPath(dossierId);
    const [next, events] = await Promise.all([
      read<Model>(path),
      read<HistoryEntry[]>(`${path}/history`),
    ]);
    setModel(next);
    setHistory(events);
  }
  useEffect(() => {
    Promise.all([read<{ items: Dossier[] }>('/api/dossiers'), refresh('demo-kosmio')])
      .then(([result]) => setDossiers(result.items))
      .catch((error) => setError(error.message));
  }, []);
  async function openDossier(dossierId: string) {
    setBusy(true);
    setError('');
    setModel(undefined);
    setSelected(undefined);
    setShowHistory(false);
    setShowSharing(false);
    setProposal(undefined);
    try {
      await refresh(dossierId);
      setActiveDossier(dossierId);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function createDossier(input: { name: string; activity: string | null }) {
    setBusy(true);
    setError('');
    try {
      const dossier = await post<Dossier>('/api/dossiers', input);
      setDossiers((current) => [...current, dossier]);
      setShowCreate(false);
      await refresh(dossier.id);
      setActiveDossier(dossier.id);
      setNotice('Dossier créé dans la préparation privée.');
      return dossier;
    } catch (error) {
      setError((error as Error).message);
      throw error;
    } finally {
      setBusy(false);
    }
  }
  async function apply(command: Command) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await post<CommandResult>('/api/commands', command);
      if (result.status === 'applied' || result.status === 'duplicate') {
        await refresh();
        if (command.origin === 'conversation') {
          setProposal(undefined);
          setText('');
        }
        setNotice('Modification enregistrée.');
        return true;
      } else {
        setError(result.message ?? 'La modification a été refusée.');
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
    return false;
  }
  function manual(operations: Command['operations'], baseRevision = model!.revision): Command {
    return {
      schema_version: '1',
      command_id: crypto.randomUUID(),
      dossier_id: model!.dossier_id,
      model_id: model!.id,
      base_revision: baseRevision,
      origin: 'manual',
      operations,
    };
  }
  async function propose() {
    if (!model || !text.trim()) return;
    setBusy(true);
    setError('');
    setNotice('');
    setProposal(undefined);
    try {
      const result = await post<Proposal>('/api/proposals', {
        dossier_id: model.dossier_id,
        model_id: model.id,
        base_revision: model.revision,
        text,
        view,
        selected_id: selected,
      });
      setProposal(result);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const task = model?.tasks.find((task) => task.id === selected);
  const proposalTarget = proposal?.context?.selected_id;
  const dossier = dossiers.find((item) => item.id === activeDossier);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="ProcessIA, accueil">
          <span className="brand-mark">
            p<span>·</span>
          </span>
          Process<span>IA</span>
        </a>
        <div className="workspace-label">ESPACE DE TRAVAIL</div>
        <div className="dossier-list" data-testid="dossier-list">
          {dossiers.map((item) => (
            <button
              key={item.id}
              data-dossier-id={item.id}
              className={item.id === activeDossier ? 'active' : ''}
              aria-label={`Ouvrir ${item.name}, ${item.activity ?? 'activité à préciser'}, identifiant ${item.id}`}
              onClick={() => openDossier(item.id)}
              disabled={busy}
            >
              <span className="avatar">{item.name.slice(0, 1).toLocaleUpperCase('fr')}</span>
              <span>
                <strong>{item.name}</strong>
                <small>{item.activity ?? 'Activité à préciser'}</small>
                <em>{item.id}</em>
              </span>
            </button>
          ))}
        </div>
        <button className="new-dossier" onClick={() => setShowCreate(true)}>
          <span>＋</span> Créer un dossier
        </button>
        <div className="side-separator" />
        <span className="workspace-label">VOTRE DOSSIER</span>
        <div className="nav-current">
          <span>⌘</span> Studio de modélisation
        </div>
        <div className="sidebar-note">
          Une représentation partagée du travail, construite pas à pas.
        </div>
        <div className="development">
          <span className="workspace-label">TRAJECTOIRE DU PROJET</span>
          <p>
            <span className="step-dot active" />
            Carte & édition <small>En cours</small>
          </p>
          <p>
            <span className="step-dot" />
            Sources & partage
          </p>
          <p>
            <span className="step-dot" />
            Entretien vocal
          </p>
          <p>
            <span className="step-dot" />
            Diagnostic & feuille de route
          </p>
        </div>
        <div className="sidebar-footer">
          <span className="avatar small">C</span>
          <div>
            <strong>Consultant local</strong>
            <small>Préparation privée</small>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <span data-testid="active-dossier-name">{dossier?.name ?? 'Dossier'}</span>{' '}
            <span>/</span> Studio <span>/</span> <strong>Diagnostic IA</strong>
          </div>
          <span className="local-badge">
            <i /> Démonstration locale
          </span>
        </header>
        <section className="page-heading">
          <div>
            <div className="eyebrow">COMPRENDRE LE TRAVAIL</div>
            <h1>{model?.name ?? 'Studio de modélisation'}</h1>
            <p>
              <span data-testid="active-dossier-activity">
                {dossier?.activity ?? 'Activité à préciser'}
              </span>{' '}
              · Décrivez, explorez et précisez votre processus.
            </p>
          </div>
          <div className="heading-actions">
            <span className="private-badge">♧ Préparation privée</span>
            <button
              className="secondary"
              onClick={() => {
                setShowHistory(!showHistory);
                setSelected(undefined);
              }}
              aria-pressed={showHistory}
            >
              ↶ Journal des versions
            </button>
            <button
              className="secondary"
              onClick={() => {
                setShowSharing(!showSharing);
                setShowHistory(false);
                setSelected(undefined);
              }}
              aria-pressed={showSharing}
            >
              ♧ Sources & partage
            </button>
          </div>
        </section>
        <div className="demo-note">
          <strong>Données synthétiques</strong>
          <span>Ce processus est un exemple à challenger. Les étapes restent proposées.</span>
        </div>
        {error && (
          <div role="alert" className="error-banner">
            {error}{' '}
            <button
              onClick={() => {
                refresh()
                  .then(() => {
                    setError('');
                    setProposal(undefined);
                  })
                  .catch((error) => setError(error.message));
              }}
            >
              Recharger la carte
            </button>
          </div>
        )}
        {!model ? (
          <div className="loading" role="status">
            Ouverture du dossier…
          </div>
        ) : (
          <>
            <section
              className={`studio ${task || showHistory || showSharing ? 'with-inspector' : ''}`}
              aria-label="Studio du processus"
            >
              <div className="canvas-shell">
                <div className="canvas-toolbar">
                  <div className="view-switch">
                    <button aria-pressed={view === 'map'} onClick={() => setView('map')}>
                      ⌘ Carte
                    </button>
                    <button aria-pressed={view === 'list'} onClick={() => setView('list')}>
                      ☷ Liste
                    </button>
                  </div>
                  <span className="task-count">
                    {model.tasks.length} tâches <span>·</span> {model.links.length} liens
                  </span>
                  <span className="draft-badge">Brouillon</span>
                  <button
                    className="undo-button"
                    aria-label="Annuler la dernière modification"
                    title="Annuler la dernière modification"
                    disabled={busy || !history[0] || history[0].operations[0]?.type === 'UNDO'}
                    onClick={() =>
                      apply(manual([{ type: 'UNDO', target_command_id: history[0].command_id }]))
                    }
                  >
                    ↶
                  </button>
                </div>
                <div className="canvas" aria-label="Carte des tâches">
                  {view === 'map' ? (
                    <Canvas
                      model={model}
                      selected={selected}
                      proposalTarget={proposalTarget}
                      busy={busy}
                      onMove={(id, position, base) =>
                        apply(manual([{ type: 'MOVE_ELEMENT', element_id: id, position }], base))
                      }
                      onSelect={(id) => {
                        setSelected(id);
                        setShowHistory(false);
                      }}
                    />
                  ) : (
                    <div className="task-list">
                      {model.tasks.map((task, index) => (
                        <button
                          key={task.id}
                          data-proposal-target={task.id === proposalTarget ? 'true' : undefined}
                          className={task.id === proposalTarget ? 'proposal-target' : undefined}
                          onClick={() => {
                            setSelected(task.id);
                            setShowHistory(false);
                          }}
                        >
                          <span className="list-number">{String(index + 1).padStart(2, '0')}</span>
                          <strong>{task.label}</strong>
                          <small>{task.role ?? 'Rôle à préciser'}</small>
                          <span>Proposé ›</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="canvas-footer">
                  <span>
                    <i /> Cliquez sur une tâche pour l’explorer
                  </span>
                  <span data-testid="revision">Révision {model.revision}</span>
                </div>
              </div>
              {task && (
                <TaskInspector
                  key={task.id}
                  task={task}
                  values={taskDetailValues(model, task)}
                  revision={model.revision}
                  busy={busy}
                  onClose={() => setSelected(undefined)}
                  onRename={(label, base) =>
                    apply(manual([{ type: 'UPDATE_LABEL', element_id: task.id, label }], base))
                  }
                  onSaveDetails={(values, base) =>
                    apply(manual(taskDetailOperations(model, task, values), base))
                  }
                />
              )}
              {showHistory && (
                <aside className="inspector">
                  <div className="inspector-heading">
                    <span>JOURNAL DES VERSIONS</span>
                    <button aria-label="Fermer le journal" onClick={() => setShowHistory(false)}>
                      ×
                    </button>
                  </div>
                  <h2>Un historique conservé</h2>
                  <p className="muted">
                    Chaque modification enregistrée crée une nouvelle révision.
                  </p>
                  {history.length === 0 && (
                    <p className="empty-state">
                      La carte de départ est prête. Votre première modification apparaîtra ici.
                    </p>
                  )}
                  <ol className="history">
                    {history.map((event) => (
                      <li key={event.revision}>
                        <strong>Révision {event.revision}</strong>
                        <small>
                          {event.origin === 'conversation' ? 'Dialogue simulé' : 'Édition directe'}{' '}
                          ·{' '}
                          {new Date(event.created_at).toLocaleTimeString('fr', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </small>
                        <p>
                          {event.statement ??
                            event.operations
                              .map((operation) =>
                                operation.type === 'ADD_TASK'
                                  ? `Ajout : ${operation.label}`
                                  : operation.type === 'UPDATE_LABEL'
                                    ? `Renommage : ${operation.label}`
                                    : operation.type === 'UNDO'
                                      ? 'Annulation de la dernière modification'
                                      : 'Déplacement d’une tâche',
                              )
                              .join(', ')}
                        </p>
                      </li>
                    ))}
                  </ol>
                </aside>
              )}
              {showSharing && (
                <SharingPanel
                  key={activeDossier}
                  dossierId={activeDossier}
                  onClose={() => setShowSharing(false)}
                />
              )}
            </section>
            <section className="conversation" aria-label="Dialogue de modélisation">
              <div className="conversation-heading">
                <div className="assistant-icon">✳</div>
                <div>
                  <strong>Faisons évoluer votre carte</strong>
                  <p>Une proposition à relire, puis à appliquer.</p>
                </div>
                <span className="simulation-badge">Dialogue simulé · voix à venir</span>
              </div>
              {proposal && (
                <div className="proposal" role="status">
                  <strong>
                    {proposal.status === 'proposed'
                      ? 'Proposition de modification'
                      : 'Précision nécessaire'}
                  </strong>
                  <p>{proposal.message}</p>
                  {proposal.context && (
                    <p className="proposal-context" data-testid="proposal-context">
                      <span>Contexte figé</span>
                      {proposal.context.selected_label ? (
                        <>
                          {' '}
                          · Concerne <strong>{proposal.context.selected_label}</strong>
                        </>
                      ) : (
                        <> · Aucune tâche sélectionnée</>
                      )}{' '}
                      · {proposal.context.view === 'map' ? 'Carte' : 'Liste'} · Révision{' '}
                      {proposal.context.revision}
                    </p>
                  )}
                  {proposal.command && (
                    <>
                      <ul>
                        {proposal.command.operations.map((operation, index) => (
                          <li key={index}>
                            {operation.type === 'ADD_TASK'
                              ? `Ajouter « ${operation.label} »${operation.before_id ? ` avant « ${model.tasks.find((task) => task.id === operation.before_id)?.label ?? 'la tâche sélectionnée'} »` : operation.after_id ? ` après « ${model.tasks.find((task) => task.id === operation.after_id)?.label ?? 'la tâche sélectionnée'} »` : ''}.`
                              : operation.type === 'UPSERT_INFORMATION'
                                ? `Préparer l’information « ${operation.label} » comme ${operation.category === 'template' ? 'modèle documentaire' : 'information métier'}.`
                                : operation.type === 'LINK_INFORMATION'
                                  ? `Rattacher cette information à « ${model.tasks.find((task) => task.id === operation.task_id)?.label ?? 'la tâche ciblée'} » avec l’état à confirmer.`
                                  : 'Modifier la tâche ciblée.'}
                          </li>
                        ))}
                      </ul>
                      <div className="proposal-actions">
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={() => apply(proposal.command!)}
                        >
                          Appliquer à la carte
                        </button>
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => {
                            setProposal(undefined);
                            setNotice('Proposition écartée. La carte est conservée.');
                          }}
                        >
                          Écarter
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  propose();
                }}
              >
                <label className="sr-only" htmlFor="request">
                  Votre demande
                </label>
                <input
                  id="request"
                  maxLength={2000}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Décrivez la modification souhaitée…"
                  disabled={busy}
                />
                <button className="primary" disabled={busy || !text.trim()} type="submit">
                  {busy ? 'Traitement…' : 'Proposer la modification'}{' '}
                  <span aria-hidden="true">↑</span>
                </button>
              </form>
              <div className="conversation-footer">
                <button
                  className="example"
                  disabled={busy}
                  onClick={() => setText('Ajoute une validation avant la restitution')}
                >
                  Essayer : ajouter une validation avant la restitution ↗
                </button>
                <span role="status" className="saved-notice">
                  {notice}
                </span>
              </div>
            </section>
          </>
        )}
        <footer className="page-footer">
          <span>ProcessIA · Du fonctionnement réel à l’action collective</span>
          <span>Première tranche de développement</span>
        </footer>
        {showCreate && (
          <CreateDossierDialog
            busy={busy}
            onCancel={() => setShowCreate(false)}
            onCreate={createDossier}
          />
        )}
      </main>
    </div>
  );
}
