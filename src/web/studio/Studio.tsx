import { useEffect, useRef, useState } from 'react';
import type {
  Model,
  Command,
  CommandResult,
  HistoryEntry,
  Dossier,
  Task,
} from '../../contracts/model.ts';
import type { Proposal } from '../../application/interviews/propose.ts';
import type { InterviewMessage, InterviewSession } from '../../contracts/interview.ts';
import { Canvas } from './Canvas.tsx';
import { TaskInspector, type TaskDetailValues } from './TaskInspector.tsx';
import { CreateDossierDialog } from './CreateDossierDialog.tsx';
import { SharingPanel } from '../sharing/SharingPanel.tsx';
import type {
  BpmnCommand,
  BpmnDocument,
  BpmnResult,
  BpmnValidation,
} from '../../contracts/bpmn.ts';
import { BpmnPanel } from '../bpmn/BpmnPanel.tsx';
import type { InterviewInvestigation } from '../../contracts/interview-review.ts';
import { InterviewReviewPanel } from '../consultant/InterviewReviewPanel.tsx';
import type { Diagnostic } from '../../contracts/diagnostic.ts';
import { DiagnosticPanel } from '../diagnostic/DiagnosticPanel.tsx';

const modelPath = (dossierId: string) => `/api/dossiers/${dossierId}/models/process-diagnostic`;
const bpmnPath = (dossierId: string) => `${modelPath(dossierId)}/bpmn`;
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
  const [showBpmn, setShowBpmn] = useState(false);
  const [bpmnDocument, setBpmnDocument] = useState<BpmnDocument>();
  const [bpmnValidation, setBpmnValidation] = useState<BpmnValidation>();
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState<InterviewInvestigation[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [text, setText] = useState('');
  const [proposal, setProposal] = useState<Proposal>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [interview, setInterview] = useState<InterviewSession>();
  const [editingTranscript, setEditingTranscript] = useState<string>();
  const [correctionText, setCorrectionText] = useState('');
  const microphone = useRef<MediaStream | undefined>(undefined);
  function stopMicrophone() {
    microphone.current?.getTracks().forEach((track) => track.stop());
    microphone.current = undefined;
  }
  async function refresh(dossierId = activeDossier) {
    const path = modelPath(dossierId);
    const [next, events] = await Promise.all([
      read<Model>(path),
      read<HistoryEntry[]>(`${path}/history`),
    ]);
    setModel(next);
    setHistory(events);
    const activeInterview = await post<InterviewSession>('/api/interviews', {
      dossier_id: next.dossier_id,
      model_id: next.id,
      transcription_policy: 'session',
    });
    setInterview(activeInterview);
  }
  useEffect(() => {
    Promise.all([read<{ items: Dossier[] }>('/api/dossiers'), refresh('demo-kosmio')])
      .then(([result]) => setDossiers(result.items))
      .catch((error) => setError(error.message));
    return stopMicrophone;
  }, []);
  async function openDossier(dossierId: string) {
    setBusy(true);
    setError('');
    setModel(undefined);
    setSelected(undefined);
    setShowHistory(false);
    setShowSharing(false);
    setShowBpmn(false);
    setBpmnDocument(undefined);
    setBpmnValidation(undefined);
    setShowReviews(false);
    setReviews([]);
    setShowDiagnostics(false);
    setDiagnostics([]);
    setProposal(undefined);
    stopMicrophone();
    setInterview(undefined);
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
  async function openBpmn() {
    setBusy(true);
    setError('');
    try {
      const path = bpmnPath(activeDossier);
      const [document, validation] = await Promise.all([
        read<BpmnDocument>(path),
        read<BpmnValidation>(`${path}/validation`),
      ]);
      setBpmnDocument(document);
      setBpmnValidation(validation);
      setShowBpmn(true);
      setShowReviews(false);
      setShowDiagnostics(false);
      setShowHistory(false);
      setShowSharing(false);
      setSelected(undefined);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function applyBpmn(command: BpmnCommand) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const path = bpmnPath(activeDossier);
      const result = await post<BpmnResult>(`${path}/commands`, command);
      if (result.status === 'applied' && result.document) {
        setBpmnDocument(result.document);
        setBpmnValidation(await read<BpmnValidation>(`${path}/validation`));
        setNotice('Navigation BPMN enregistrée.');
        return true;
      }
      setError(result.message ?? 'La modification BPMN a été refusée.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
    return false;
  }
  async function openReviews() {
    setBusy(true);
    setError('');
    try {
      const result = await read<{ items: InterviewInvestigation[] }>(
        `${modelPath(activeDossier)}/interview-reviews`,
      );
      setReviews(result.items);
      setShowReviews(true);
      setShowBpmn(false);
      setShowDiagnostics(false);
      setShowHistory(false);
      setShowSharing(false);
      setSelected(undefined);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function openDiagnostics() {
    setBusy(true);
    setError('');
    try {
      const result = await read<{ items: Diagnostic[] }>(`${modelPath(activeDossier)}/diagnostics`);
      setDiagnostics(result.items);
      setShowDiagnostics(true);
      setShowReviews(false);
      setShowBpmn(false);
      setShowHistory(false);
      setShowSharing(false);
      setSelected(undefined);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
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
      if (interview) {
        await post<InterviewMessage>(`/api/interviews/${interview.interview_id}/turns`, {
          idempotency_key: crypto.randomUUID(),
          mode: interview.mode,
          text,
          ...(selected
            ? { selection_snapshot: { element_id: selected, revision: model.revision } }
            : {}),
        });
        setInterview(await read<InterviewSession>(`/api/interviews/${interview.interview_id}`));
      }
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
  async function activateVoice() {
    if (!interview) return;
    setBusy(true);
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new DOMException('Microphone indisponible', 'NotSupportedError');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stopMicrophone();
      microphone.current = stream;
      await post<InterviewSession>(`/api/interviews/${interview.interview_id}/consent`, {
        granted: true,
      });
      const listening = await post<InterviewSession>(
        `/api/interviews/${interview.interview_id}/listen`,
        {},
      );
      setInterview(listening);
      setNotice('Micro activé pour ce tour. Aucun fichier audio n’est conservé.');
    } catch {
      stopMicrophone();
      const refused = await post<InterviewSession>(
        `/api/interviews/${interview.interview_id}/consent`,
        { granted: false },
      );
      setInterview(refused);
      setNotice('Micro refusé ou indisponible. Vous pouvez poursuivre par écrit.');
    } finally {
      setBusy(false);
    }
  }
  async function switchToText() {
    if (!interview) return;
    stopMicrophone();
    setInterview(
      await post<InterviewSession>(`/api/interviews/${interview.interview_id}/mode`, {
        mode: 'text',
      }),
    );
    setNotice('Saisie écrite active dans le même entretien.');
  }
  async function pauseVoice() {
    if (!interview) return;
    stopMicrophone();
    setInterview(
      await post<InterviewSession>(`/api/interviews/${interview.interview_id}/pause`, {}),
    );
    setNotice('Micro en pause. Aucun nouveau flux n’est capturé.');
  }
  async function correctTranscript(message: InterviewMessage) {
    if (!interview || !model || !correctionText.trim()) return;
    setBusy(true);
    setError('');
    try {
      await post<InterviewMessage>(
        `/api/interviews/${interview.interview_id}/messages/${message.message_id}/correct`,
        { text: correctionText },
      );
      const correctedInterview = await read<InterviewSession>(
        `/api/interviews/${interview.interview_id}`,
      );
      setInterview(correctedInterview);
      const correctedProposal = await post<Proposal>('/api/proposals', {
        dossier_id: model.dossier_id,
        model_id: model.id,
        base_revision: model.revision,
        text: correctionText,
        view,
        selected_id: message.selection_snapshot?.element_id,
      });
      setProposal(correctedProposal);
      setText(correctionText);
      setEditingTranscript(undefined);
      setCorrectionText('');
      setNotice('Transcription corrigée et proposition recalculée.');
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
              onClick={showDiagnostics ? () => setShowDiagnostics(false) : openDiagnostics}
              aria-pressed={showDiagnostics}
              aria-label={
                showDiagnostics
                  ? 'Revenir à la carte'
                  : 'Ouvrir le diagnostic et la feuille de route'
              }
            >
              ◇ {showDiagnostics ? 'Carte métier' : 'Diagnostic'}
            </button>
            <button
              className="secondary"
              onClick={showReviews ? () => setShowReviews(false) : openReviews}
              aria-pressed={showReviews}
              aria-label={
                showReviews ? 'Revenir à la carte' : 'Ouvrir la consolidation des entretiens'
              }
            >
              ◉ {showReviews ? 'Carte métier' : 'Consolidation'}
            </button>
            <button
              className="secondary"
              onClick={showBpmn ? () => setShowBpmn(false) : openBpmn}
              aria-pressed={showBpmn}
              aria-label={showBpmn ? 'Revenir à la carte' : 'Ouvrir le profil BPMN'}
            >
              ◫ {showBpmn ? 'Carte métier' : 'Profil BPMN'}
            </button>
            <button
              className="secondary"
              onClick={() => {
                setShowHistory(!showHistory);
                setShowDiagnostics(false);
                setShowReviews(false);
                setShowBpmn(false);
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
                setShowDiagnostics(false);
                setShowReviews(false);
                setShowBpmn(false);
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
        ) : showDiagnostics ? (
          <DiagnosticPanel diagnostics={diagnostics} onClose={() => setShowDiagnostics(false)} />
        ) : showReviews ? (
          <InterviewReviewPanel investigations={reviews} onClose={() => setShowReviews(false)} />
        ) : showBpmn && bpmnDocument && bpmnValidation ? (
          <BpmnPanel
            document={bpmnDocument}
            validation={bpmnValidation}
            busy={busy}
            onCommand={applyBpmn}
            onClose={() => setShowBpmn(false)}
          />
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
                <div className="voice-controls">
                  <span
                    className={`voice-state ${interview?.voice_state ?? 'ready'}`}
                    data-testid="voice-state"
                  >
                    {interview?.voice_consent === 'refused'
                      ? 'Micro refusé · texte disponible'
                      : interview?.voice_state === 'listening'
                        ? 'Écoute active'
                        : interview?.voice_state === 'processing'
                          ? 'Transcription en traitement'
                          : interview?.voice_state === 'responding'
                            ? 'Réponse en cours'
                            : interview?.voice_state === 'paused'
                              ? 'Micro en pause'
                              : 'Prêt à parler'}
                  </span>
                  {interview?.mode === 'voice' ? (
                    <>
                      {interview.voice_state === 'listening' ? (
                        <button type="button" className="voice-action" onClick={pauseVoice}>
                          Mettre le micro en pause
                        </button>
                      ) : (
                        <button type="button" className="voice-action" onClick={activateVoice}>
                          Reprendre le micro
                        </button>
                      )}
                      <button type="button" className="voice-action" onClick={switchToText}>
                        Passer au texte
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="voice-action primary-voice"
                      disabled={!interview || busy}
                      onClick={activateVoice}
                    >
                      Activer le micro
                    </button>
                  )}
                </div>
              </div>
              <div className="voice-policy">
                <span>Transcription : session locale</span>
                <span>Audio non conservé</span>
                <span
                  className="interview-id"
                  data-testid="interview-id"
                  data-interview-id={interview?.interview_id}
                >
                  Entretien {interview?.interview_id.slice(0, 8) ?? 'en préparation'}
                </span>
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
              {interview && interview.messages.some((message) => message.role === 'user') && (
                <div className="transcript-history" aria-label="Historique de l’entretien">
                  {interview.messages
                    .filter((message) => message.role === 'user')
                    .slice(-3)
                    .map((message) => (
                      <article key={message.message_id}>
                        <div>
                          <span>
                            {message.mode === 'voice' ? 'Transcription' : 'Message écrit'}
                          </span>
                          <small>Tour {message.sequence}</small>
                        </div>
                        <p>{message.text}</p>
                        {message.corrections?.length ? (
                          <small>
                            Corrigé · original conservé : «{' '}
                            {message.corrections[message.corrections.length - 1].previous_text} »
                          </small>
                        ) : null}
                        {message.mode === 'voice' && editingTranscript !== message.message_id && (
                          <button
                            type="button"
                            className="transcript-action"
                            onClick={() => {
                              setEditingTranscript(message.message_id);
                              setCorrectionText(message.text);
                            }}
                          >
                            Corriger la transcription
                          </button>
                        )}
                        {editingTranscript === message.message_id && (
                          <div className="transcript-correction">
                            <label htmlFor={`correction-${message.message_id}`}>
                              Correction de la transcription
                            </label>
                            <input
                              id={`correction-${message.message_id}`}
                              value={correctionText}
                              onChange={(event) => setCorrectionText(event.target.value)}
                              maxLength={2000}
                            />
                            <button
                              type="button"
                              className="primary"
                              disabled={busy || !correctionText.trim()}
                              onClick={() => correctTranscript(message)}
                            >
                              Enregistrer et réinterpréter
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
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
                  {busy
                    ? 'Traitement…'
                    : interview?.mode === 'voice'
                      ? 'Interpréter la transcription'
                      : 'Proposer la modification'}{' '}
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
