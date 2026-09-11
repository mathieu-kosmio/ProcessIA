import type { InterviewInvestigation } from '../../contracts/interview-review.ts';

type Props = {
  investigations: InterviewInvestigation[];
  onClose: () => void;
};

export function InterviewReviewPanel({ investigations, onClose }: Props) {
  return (
    <section className="review-panel" aria-label="Consolidation privée des entretiens">
      <div className="review-heading">
        <div>
          <span className="eyebrow">ESPACE CONSULTANT · PRÉPARATION PRIVÉE</span>
          <h2>Consolidation des entretiens</h2>
          <p>Comparer les formulations, conserver leurs sources et préparer la clarification.</p>
        </div>
        <button className="secondary" onClick={onClose}>
          Revenir à la carte
        </button>
      </div>

      {investigations.length === 0 ? (
        <div className="review-empty">
          <strong>Aucune divergence ouverte</strong>
          <p>Les prochains témoignages pourront être comparés ici.</p>
        </div>
      ) : (
        <div className="review-list">
          {investigations.map((investigation) => (
            <article className="review-case" key={investigation.investigation_id}>
              <header>
                <div>
                  <span className="review-alert">Divergence à clarifier</span>
                  <h3>{investigation.subject.label}</h3>
                  <p>
                    Élément lié : <code>{investigation.subject.element_id}</code>
                  </p>
                </div>
                <span className="review-open-state">Ouverte</span>
              </header>

              <div className="review-comparison">
                {investigation.assertions.map((assertion, index) => (
                  <section data-testid="review-assertion" key={assertion.assertion_id}>
                    <div className="review-source">
                      <span>TÉMOIGNAGE {String(index + 1).padStart(2, '0')}</span>
                      <strong>{assertion.provenance.source_title}</strong>
                      <time>{assertion.provenance.source_date ?? 'Date non renseignée'}</time>
                    </div>
                    <blockquote>{assertion.value}</blockquote>
                    <span className="review-knowledge">Proposé · source conservée</span>
                  </section>
                ))}
              </div>

              <div className="review-decision">
                <div>
                  <span>DÉCISION MÉTIER</span>
                  <strong>Aucun arbitrage enregistré</strong>
                  <p>
                    Les formulations restent consultables. Leur fréquence ne désigne aucune version
                    comme vraie.
                  </p>
                </div>
                <span className="review-unresolved">À clarifier</span>
              </div>

              <aside className="review-next-step">
                <div className="review-question-mark">?</div>
                <div>
                  <span>PROCHAINE QUESTION PROPOSÉE</span>
                  <strong>{investigation.clarification.question}</strong>
                  <p>{investigation.clarification.rationale}</p>
                </div>
                <div className="review-target">
                  <strong data-testid="review-target-role">
                    Rôle à interroger : {investigation.clarification.target_role.label}
                  </strong>
                  <span>Personne non renseignée</span>
                </div>
              </aside>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
