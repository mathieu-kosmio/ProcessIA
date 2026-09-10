import { useState } from 'react';
import type { Task } from '../../contracts/model.ts';

export function TaskInspector({
  task,
  revision,
  busy,
  onClose,
  onRename,
}: {
  task: Task;
  revision: number;
  busy: boolean;
  onClose: () => void;
  onRename: (label: string, baseRevision: number) => Promise<boolean>;
}) {
  const [label, setLabel] = useState(task.label);
  const [base, setBase] = useState(revision);
  return (
    <aside className="inspector">
      <div className="inspector-heading">
        <span>FICHE DE TÂCHE</span>
        <button aria-label="Fermer la fiche" onClick={onClose}>
          ×
        </button>
      </div>
      <h2>{task.label}</h2>
      <span className="knowledge-badge">Proposé · à confirmer</span>
      <form
        className="task-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (await onRename(label, base)) setBase(base + 1);
        }}
      >
        <label htmlFor="task-label">Nom de la tâche</label>
        <input
          id="task-label"
          value={label}
          maxLength={160}
          required
          onChange={(event) => setLabel(event.target.value)}
        />
        {base !== revision && (
          <p>
            La carte a été actualisée. Votre saisie est conservée. Libellé enregistré : «{' '}
            {task.label} ».
            <button type="button" className="secondary" onClick={() => setBase(revision)}>
              Utiliser cette révision
            </button>
          </p>
        )}
        <button
          className="primary"
          disabled={busy || base !== revision || !label.trim() || label.trim() === task.label}
        >
          Enregistrer le libellé
        </button>
      </form>
      <dl>
        <dt>Responsable</dt>
        <dd>{task.role ?? 'Non renseigné'}</dd>
        <dt>Origine</dt>
        <dd>Exemple synthétique</dd>
        <dt>Outils et informations</dt>
        <dd>À documenter dans la prochaine tranche.</dd>
      </dl>
    </aside>
  );
}
