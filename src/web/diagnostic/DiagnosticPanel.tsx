import { useState } from 'react';
import type {
  CapabilityMap,
  Diagnostic,
  PriorityLevel,
  TargetComparison,
} from '../../contracts/diagnostic.ts';

type Props = {
  diagnostics: Diagnostic[];
  targets: TargetComparison[];
  capabilities: CapabilityMap[];
  onRevisePriority: (
    diagnosticId: string,
    opportunityId: string,
    baseVersion: number,
    level: PriorityLevel,
    justification: string,
  ) => Promise<void>;
  onClose: () => void;
};

const priorityLabels = {
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
  unknown: 'Inconnue',
} as const;

export function DiagnosticPanel({
  diagnostics,
  targets,
  capabilities,
  onRevisePriority,
  onClose,
}: Props) {
  const [editingPriority, setEditingPriority] = useState<string>();
  const [priorityLevel, setPriorityLevel] = useState<PriorityLevel>('high');
  const [priorityJustification, setPriorityJustification] = useState('');
  const [priorityBusy, setPriorityBusy] = useState(false);
  const [priorityError, setPriorityError] = useState('');

  async function submitPriority(
    diagnostic: Diagnostic,
    opportunityId: string,
    event: React.FormEvent,
  ) {
    event.preventDefault();
    if (!priorityJustification.trim()) return;
    setPriorityBusy(true);
    setPriorityError('');
    try {
      await onRevisePriority(
        diagnostic.diagnostic_id,
        opportunityId,
        diagnostic.version,
        priorityLevel,
        priorityJustification.trim(),
      );
      setEditingPriority(undefined);
      setPriorityJustification('');
    } catch (error) {
      setPriorityError((error as Error).message);
    } finally {
      setPriorityBusy(false);
    }
  }

  return (
    <section className="diagnostic-panel" aria-label="Diagnostic privé et feuille de route">
      <div className="diagnostic-heading">
        <div>
          <span className="eyebrow">ESPACE CONSULTANT · PROPOSITION À CHALLENGER</span>
          <h2>Diagnostic et feuille de route</h2>
          <p>Relier les constats aux conditions de réussite et préparer un essai vérifiable.</p>
        </div>
        <button className="secondary" onClick={onClose}>
          Revenir à la carte
        </button>
      </div>

      {diagnostics.length === 0 && targets.length === 0 && capabilities.length === 0 ? (
        <div className="diagnostic-empty">
          <strong>Aucun diagnostic préparé</strong>
          <p>Un périmètre et des constats validables sont nécessaires.</p>
        </div>
      ) : (
        <div className="diagnostic-list">
          {diagnostics.map((diagnostic) => (
            <article className="diagnostic-report" key={diagnostic.diagnostic_id}>
              <header className="diagnostic-scope">
                <div>
                  <span className="diagnostic-kicker">PÉRIMÈTRE ÉTUDIÉ</span>
                  <h3>{diagnostic.scope.label}</h3>
                  <p>{diagnostic.scope.coverage_limit}</p>
                </div>
                <div className="diagnostic-meta">
                  <span>Brouillon</span>
                  <small>
                    Carte rév. {diagnostic.based_on_revision} · diagnostic v{diagnostic.version}
                  </small>
                </div>
              </header>

              <section className="diagnostic-finding" aria-label="Constat source">
                <span>CONSTAT LIÉ</span>
                <strong>{diagnostic.findings[0].statement}</strong>
                <small>
                  {diagnostic.findings[0].task_ids.length} tâche liée · divergence conservée
                </small>
              </section>

              {diagnostic.opportunities.map((opportunity) => (
                <section className="diagnostic-opportunity" key={opportunity.opportunity_id}>
                  <div className="opportunity-title-row">
                    <div>
                      <span className="opportunity-type">USAGE IA PROPOSÉ</span>
                      <h3>{opportunity.title}</h3>
                      <p>Bénéficiaire : {opportunity.beneficiary}</p>
                    </div>
                    <div className="priority-pill">
                      <span>
                        {opportunity.priority.status === 'manual'
                          ? 'Priorité manuelle'
                          : 'Priorité proposée'}
                      </span>
                      <strong>{priorityLabels[opportunity.priority.level]}</strong>
                    </div>
                  </div>

                  <div className="diagnostic-metrics">
                    <div>
                      <span>VALEUR ATTENDUE</span>
                      <strong data-testid="diagnostic-expected-value">
                        {opportunity.expected_value.value === null
                          ? opportunity.expected_value.label
                          : `${opportunity.expected_value.value} / 5`}
                      </strong>
                      <p>{opportunity.expected_value.justification}</p>
                    </div>
                    <div className="unknown-metric">
                      <span>FAISABILITÉ</span>
                      <strong data-testid="diagnostic-feasibility">
                        {opportunity.feasibility.label}
                      </strong>
                      <p>{opportunity.feasibility.justification}</p>
                    </div>
                    <div>
                      <span>GAIN ESTIMÉ</span>
                      <strong>{diagnostic.estimated_gain.label}</strong>
                      <p>Aucune mesure de temps collectée.</p>
                    </div>
                  </div>

                  <div className="priority-rationale">
                    <strong>{opportunity.score_explanation}</strong>
                    <p>{opportunity.priority.rationale}</p>
                  </div>

                  <div className="priority-review">
                    {editingPriority === opportunity.opportunity_id ? (
                      <form
                        onSubmit={(event) =>
                          submitPriority(diagnostic, opportunity.opportunity_id, event)
                        }
                      >
                        <label>
                          Nouvelle priorité
                          <select
                            value={priorityLevel}
                            disabled={priorityBusy}
                            onChange={(event) =>
                              setPriorityLevel(event.target.value as PriorityLevel)
                            }
                          >
                            {Object.entries(priorityLabels).map(([value, label]) => (
                              <option value={value} key={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Justification de la priorité
                          <textarea
                            value={priorityJustification}
                            disabled={priorityBusy}
                            required
                            rows={3}
                            onChange={(event) => setPriorityJustification(event.target.value)}
                          />
                        </label>
                        {priorityError && <p role="alert">{priorityError}</p>}
                        <div>
                          <button type="submit" className="primary" disabled={priorityBusy}>
                            {priorityBusy ? 'Enregistrement…' : 'Enregistrer la priorité'}
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            disabled={priorityBusy}
                            onClick={() => setEditingPriority(undefined)}
                          >
                            Annuler
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        className="secondary"
                        onClick={() => {
                          setPriorityLevel(
                            opportunity.priority.level === 'high' ? 'medium' : 'high',
                          );
                          setPriorityJustification('');
                          setPriorityError('');
                          setEditingPriority(opportunity.opportunity_id);
                        }}
                      >
                        Réviser la priorité
                      </button>
                    )}
                  </div>

                  {diagnostic.priority_history.some(
                    (entry) => entry.opportunity_id === opportunity.opportunity_id,
                  ) && (
                    <section className="priority-history" aria-label="Historique des priorités">
                      <h4>Historique des priorités</h4>
                      <ol>
                        {diagnostic.priority_history
                          .filter((entry) => entry.opportunity_id === opportunity.opportunity_id)
                          .map((entry) => (
                            <li key={entry.revision_id}>
                              <strong>
                                {priorityLabels[entry.previous.level]} →{' '}
                                {priorityLabels[entry.next.level]}
                              </strong>
                              <span>Modifiée par {entry.actor}</span>
                              <p>{entry.justification}</p>
                            </li>
                          ))}
                      </ol>
                    </section>
                  )}

                  <div className="roadmap-section">
                    <div className="roadmap-heading">
                      <div>
                        <span className="diagnostic-kicker">FEUILLE DE ROUTE PROPOSÉE</span>
                        <h3>Du prérequis à l’essai</h3>
                      </div>
                      <span className="owner-pill">
                        Responsable : {opportunity.human_owner.label}
                      </span>
                    </div>
                    <ol className="roadmap-actions">
                      {diagnostic.roadmap.actions.map((action, index) => (
                        <li key={action.action_id}>
                          <span className="roadmap-index">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <span>{action.kind === 'prerequisite' ? 'PRÉREQUIS' : 'ESSAI'}</span>
                            <strong>{action.title}</strong>
                            <p>{action.exit_criteria.join(' · ')}</p>
                          </div>
                          <small>{action.effort_label}</small>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <footer className="diagnostic-guardrail">
                    <span className="guardrail-icon">✓</span>
                    <div>
                      <strong>Aucun agent démarré</strong>
                      <p>
                        La recommandation reste une proposition. L’essai commence après validation
                        humaine et levée des prérequis.
                      </p>
                    </div>
                  </footer>
                </section>
              ))}
            </article>
          ))}
          {capabilities.map((capability) => (
            <article
              className="capability-map"
              aria-label={`Capacité mutualisable ${capability.label}`}
              key={capability.capability_map_id}
            >
              <header>
                <div>
                  <span className="diagnostic-kicker">ARCHITECTURE DE CAPACITÉS</span>
                  <h3>Capacité mutualisable : {capability.label}</h3>
                  <p>{capability.description}</p>
                </div>
                <div className="capability-meta">
                  <span>{capability.usage_bindings.length} usages · périmètres séparés</span>
                  <small>Diagnostic v{capability.based_on_diagnostic_version}</small>
                </div>
              </header>

              <div className="capability-bindings">
                {capability.usage_bindings.map((binding, index) => (
                  <section key={binding.usage_id}>
                    <span className="capability-index">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <strong>{binding.label}</strong>
                      <p>{binding.context}</p>
                      <small>
                        {binding.task_ids.length} tâche{binding.task_ids.length > 1 ? 's' : ''} liée
                        {binding.task_ids.length > 1 ? 's' : ''}
                      </small>
                    </div>
                    <span className={`capability-scope ${binding.required_scope}`}>
                      {binding.required_scope === 'private'
                        ? 'Préparation privée'
                        : 'Projection partagée'}
                    </span>
                  </section>
                ))}
              </div>

              <footer className="capability-boundary">
                <div>
                  <span>Fournisseur à choisir</span>
                  <span>Exécution désactivée</span>
                </div>
                <strong>Aucun accès aux données n’est mutualisé.</strong>
              </footer>
            </article>
          ))}
          {targets.map((target) => (
            <article className="target-comparison" key={target.target_id}>
              <header>
                <div>
                  <span className="diagnostic-kicker">COMPARAISON ACTUEL / CIBLE</span>
                  <h3>Scénario cible : {target.name}</h3>
                  <p>
                    Révision de départ {target.based_on_revision} · révision actuelle{' '}
                    {target.current_revision}
                  </p>
                </div>
                <span
                  className={`target-reference-state ${target.reconciliation_required ? 'outdated' : ''}`}
                >
                  {target.reconciliation_required ? 'Réconciliation requise' : 'Référence à jour'}
                </span>
              </header>

              {target.changes.map((change) => (
                <section className="target-change" key={change.change_id}>
                  <div className="target-value current">
                    <span>FONCTIONNEMENT ACTUEL</span>
                    <strong>{change.current_value ?? 'Élément absent'}</strong>
                    <small>Valeur de référence : {change.reference_value}</small>
                  </div>
                  <div className="target-arrow" aria-hidden="true">
                    →
                  </div>
                  <div className="target-value proposed">
                    <span>
                      {target.target_status === 'validated' ? 'CIBLE VALIDÉE' : 'CIBLE PROPOSÉE'}
                    </span>
                    <strong>{change.target_value}</strong>
                    <small>
                      {change.prepared_by === 'ai' ? 'Préparée par IA' : 'Préparée humainement'}
                    </small>
                  </div>
                  <p className="target-rationale">{change.rationale}</p>
                </section>
              ))}

              {target.validation && (
                <div className="target-validation">
                  <div>
                    <span>VALIDATION HUMAINE</span>
                    <strong>Validée par {target.validation.actor}</strong>
                    <p>{target.validation.justification}</p>
                  </div>
                  <small>Scénario souhaité, sans déploiement</small>
                </div>
              )}

              <footer className="target-guardrail">
                <strong>La cible ne modifie pas le fonctionnement actuel.</strong>
                <span>
                  {target.reconciliation_required
                    ? 'La carte a évolué. Une réconciliation explicite est nécessaire.'
                    : 'Toute mise en œuvre exige une décision et une action distinctes.'}
                </span>
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
