import type { BpmnCommand, BpmnDocument, BpmnNode, BpmnValidation } from '../../contracts/bpmn.ts';

type Props = {
  document: BpmnDocument;
  validation: BpmnValidation;
  busy: boolean;
  onCommand: (command: BpmnCommand) => Promise<boolean>;
  onClose: () => void;
};

const typeLabels: Record<BpmnNode['type'], string> = {
  startEvent: 'Début',
  endEvent: 'Fin',
  task: 'Tâche',
  userTask: 'Tâche utilisateur',
  manualTask: 'Tâche manuelle',
  serviceTask: 'Tâche de service',
  exclusiveGateway: 'Décision exclusive',
  parallelGateway: 'Passage parallèle',
  subprocess: 'Sous-processus',
  textAnnotation: 'Annotation',
  dataObject: 'Objet de données',
  dataStore: 'Stockage de données',
};

export function BpmnPanel({ document, validation, busy, onCommand, onClose }: Props) {
  const focusedSubprocessId = document.view.breadcrumb_ids.find((id) =>
    document.nodes.some((node) => node.id === id && node.type === 'subprocess'),
  );
  const focusedSubprocess = document.nodes.find((node) => node.id === focusedSubprocessId);
  const selected = document.nodes.find((node) => node.id === document.view.selected_id);
  const breadcrumbLabels = document.view.breadcrumb_ids.map((id) => {
    if (id === document.id) return document.name;
    const participant = document.participants.find((item) => item.process_id === id);
    if (participant) return `Processus ${participant.label}`;
    return document.nodes.find((node) => node.id === id)?.label ?? id;
  });

  function command(operations: BpmnCommand['operations']): BpmnCommand {
    return {
      command_id: crypto.randomUUID(),
      base_revision: document.revision,
      operations,
    };
  }

  function setView(input: {
    openProcessId?: string;
    breadcrumbIds?: string[];
    selectedId?: string;
    zoom?: number;
  }) {
    return onCommand(
      command([
        {
          type: 'SET_VIEW',
          open_process_id: input.openProcessId ?? document.view.open_process_id,
          breadcrumb_ids: input.breadcrumbIds ?? document.view.breadcrumb_ids,
          selected_id: input.selectedId ?? document.view.selected_id,
          zoom: input.zoom ?? document.view.zoom,
        },
      ]),
    );
  }

  function openSubprocess(node: BpmnNode) {
    return onCommand(
      command([
        { type: 'TOGGLE_SUBPROCESS', subprocess_id: node.id, collapsed: false },
        {
          type: 'SET_VIEW',
          open_process_id: node.process_id,
          breadcrumb_ids: [document.id, node.process_id, node.id],
          selected_id:
            document.nodes.find((candidate) => candidate.parent_subprocess_id === node.id)?.id ??
            node.id,
          zoom: document.view.zoom,
        },
      ]),
    );
  }

  function closeSubprocess() {
    if (!focusedSubprocess) return Promise.resolve(false);
    return onCommand(
      command([
        {
          type: 'TOGGLE_SUBPROCESS',
          subprocess_id: focusedSubprocess.id,
          collapsed: true,
        },
        {
          type: 'SET_VIEW',
          open_process_id: focusedSubprocess.process_id,
          breadcrumb_ids: [document.id, focusedSubprocess.process_id],
          selected_id: focusedSubprocess.id,
          zoom: document.view.zoom,
        },
      ]),
    );
  }

  const visibleNodes = focusedSubprocess
    ? document.nodes.filter(
        (node) =>
          node.parent_subprocess_id === focusedSubprocess.id ||
          (node.parent_subprocess_id === null &&
            node.participant_id !== focusedSubprocess.participant_id),
      )
    : document.nodes.filter((node) => node.parent_subprocess_id === null);
  const subprocessChildren = focusedSubprocess
    ? document.nodes.filter((node) => node.parent_subprocess_id === focusedSubprocess.id)
    : [];

  return (
    <section className="bpmn-profile" aria-label="Profil BPMN du processus">
      <div className="bpmn-profile-heading">
        <div>
          <span className="eyebrow">VUE DÉTAILLÉE DU PROCESSUS</span>
          <h2>Profil BPMN V1</h2>
          <p>Un profil métier borné, conservé comme brouillon versionné.</p>
        </div>
        <button className="secondary" onClick={onClose}>
          Revenir à la carte
        </button>
      </div>

      <div className="bpmn-navigation">
        <nav aria-label="Fil de navigation BPMN" data-testid="bpmn-breadcrumb">
          {breadcrumbLabels.map((label, index) => (
            <span key={`${label}-${index}`}>
              {index > 0 && <i>›</i>}
              {label}
            </span>
          ))}
        </nav>
        <div className="bpmn-zoom">
          <button
            aria-label="Réduire le diagramme"
            disabled={busy || document.view.zoom <= 0.25}
            onClick={() => setView({ zoom: Math.max(0.25, document.view.zoom - 0.1) })}
          >
            −
          </button>
          <strong data-testid="bpmn-zoom">{Math.round(document.view.zoom * 100)} %</strong>
          <button
            aria-label="Agrandir le diagramme"
            disabled={busy || document.view.zoom >= 4}
            onClick={() => setView({ zoom: Math.min(4, document.view.zoom + 0.1) })}
          >
            +
          </button>
        </div>
      </div>

      <div className="bpmn-status-row">
        <div
          className={`bpmn-validation ${validation.valid_for_export ? 'valid' : 'warning'}`}
          role="status"
          aria-label="Validation BPMN"
        >
          <strong>
            {validation.valid_for_export
              ? 'Profil cohérent'
              : `${validation.anomalies.length} anomalies à traiter`}
          </strong>
          <span>{validation.valid_for_export ? 'Export préparé' : 'Brouillon conservé'}</span>
        </div>
        <span className="bpmn-selection" data-testid="bpmn-selection">
          Sélection : {selected?.label ?? 'aucune'}
        </span>
        <span className="bpmn-revision">Révision BPMN {document.revision}</span>
      </div>

      {focusedSubprocess && (
        <div className="subprocess-context">
          <div>
            <strong>{focusedSubprocess.label}</strong>
            <span>{subprocessChildren.length} étapes internes conservées</span>
          </div>
          <button disabled={busy} onClick={closeSubprocess}>
            Replier et revenir au processus
          </button>
        </div>
      )}

      <div
        className="bpmn-board"
        style={{ '--bpmn-zoom': document.view.zoom } as React.CSSProperties}
      >
        {document.participants.map((participant) => {
          const participantNodes = visibleNodes.filter(
            (node) => node.participant_id === participant.id,
          );
          if (focusedSubprocess && participantNodes.length === 0) return null;
          return (
            <article className="bpmn-pool" key={participant.id}>
              <header>
                <span>PARTICIPANT</span>
                <strong>{participant.label}</strong>
                <small>{participant.process_id}</small>
              </header>
              <div className="bpmn-lanes">
                {document.lanes
                  .filter((lane) => lane.participant_id === participant.id)
                  .map((lane) => {
                    const laneNodes = participantNodes.filter((node) => node.lane_id === lane.id);
                    return (
                      <section
                        className="bpmn-lane"
                        key={lane.id}
                        aria-label={`Couloir ${lane.label}`}
                      >
                        <h3>{lane.label}</h3>
                        <div className="bpmn-node-row">
                          {laneNodes.length === 0 ? (
                            <span className="empty-lane">Aucune étape dans cette vue</span>
                          ) : (
                            laneNodes.map((node) => (
                              <div
                                className={`bpmn-node ${node.type} ${node.id === selected?.id ? 'selected' : ''}`}
                                key={node.id}
                              >
                                <button
                                  disabled={busy}
                                  aria-label={`Sélectionner ${node.label}`}
                                  onClick={() =>
                                    setView(
                                      node.process_id === document.view.open_process_id
                                        ? { selectedId: node.id }
                                        : {
                                            openProcessId: node.process_id,
                                            breadcrumbIds: [document.id, node.process_id],
                                            selectedId: node.id,
                                          },
                                    )
                                  }
                                >
                                  <span>{typeLabels[node.type]}</span>
                                  <strong>{node.label}</strong>
                                  {node.type === 'serviceTask' && (
                                    <small>Exécution désactivée</small>
                                  )}
                                </button>
                                {node.type === 'subprocess' && !focusedSubprocess && (
                                  <button
                                    className="open-subprocess"
                                    disabled={busy}
                                    aria-label={`Ouvrir le sous-processus ${node.label}`}
                                    onClick={() => openSubprocess(node)}
                                  >
                                    Ouvrir ·{' '}
                                    {
                                      document.nodes.filter(
                                        (candidate) => candidate.parent_subprocess_id === node.id,
                                      ).length
                                    }{' '}
                                    étapes
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </section>
                    );
                  })}
              </div>
            </article>
          );
        })}
      </div>

      {!focusedSubprocess && (
        <div className="bpmn-flow-legend">
          <span>
            <i className="sequence" /> sequenceFlow dans un participant
          </span>
          <span>
            <i className="message" /> messageFlow entre participants
          </span>
        </div>
      )}

      {!validation.valid_for_export && (
        <aside className="bpmn-anomalies" aria-label="Anomalies du brouillon BPMN">
          <strong>Points à compléter avant export</strong>
          <ul>
            {validation.anomalies.map((anomaly) => (
              <li key={`${anomaly.process_id}-${anomaly.code}`}>{anomaly.message}</li>
            ))}
          </ul>
        </aside>
      )}
    </section>
  );
}
