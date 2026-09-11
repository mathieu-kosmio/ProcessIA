import type { Diagnostic, TargetComparison } from '../../contracts/diagnostic.ts';

type Props = {
  diagnostics: Diagnostic[];
  targets: TargetComparison[];
  onClose: () => void;
};

const priorityLabels = {
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
  unknown: 'Inconnue',
} as const;

export function DiagnosticPanel({ diagnostics, targets, onClose }: Props) {
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

      {diagnostics.length === 0 && targets.length === 0 ? (
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
                  <small>Révision {diagnostic.based_on_revision}</small>
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
                      <span>Priorité proposée</span>
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
