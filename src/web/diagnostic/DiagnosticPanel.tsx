import type { Diagnostic } from '../../contracts/diagnostic.ts';

type Props = {
  diagnostics: Diagnostic[];
  onClose: () => void;
};

const priorityLabels = {
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
  unknown: 'Inconnue',
} as const;

export function DiagnosticPanel({ diagnostics, onClose }: Props) {
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

      {diagnostics.length === 0 ? (
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
        </div>
      )}
    </section>
  );
}
