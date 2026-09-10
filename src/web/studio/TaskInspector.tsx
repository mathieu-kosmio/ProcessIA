import { useState } from 'react';
import type { KnowledgeState, Task } from '../../contracts/model.ts';

export type TaskDetailValues = {
  role: string;
  tool: string;
  input: string;
  output: string;
};

const knowledgeLabel: Record<KnowledgeState, string> = {
  unset: 'Non renseigné',
  proposed: 'Proposé',
  to_confirm: 'À confirmer',
  confirmed: 'Confirmé',
  contested: 'Contesté',
  confirmed_absent: 'Absence confirmée',
};

export function TaskInspector({
  task,
  values,
  revision,
  busy,
  onClose,
  onRename,
  onSaveDetails,
}: {
  task: Task;
  values: TaskDetailValues;
  revision: number;
  busy: boolean;
  onClose: () => void;
  onRename: (label: string, baseRevision: number) => Promise<boolean>;
  onSaveDetails: (values: TaskDetailValues, baseRevision: number) => Promise<boolean>;
}) {
  const [label, setLabel] = useState(task.label);
  const [details, setDetails] = useState(values);
  const [base, setBase] = useState(revision);
  const detailsChanged = (Object.keys(details) as Array<keyof TaskDetailValues>).some(
    (key) => details[key].trim() !== values[key],
  );
  const fields: Array<{
    key: keyof TaskDetailValues;
    label: string;
    placeholder: string;
    knowledge: KnowledgeState;
  }> = [
    {
      key: 'role',
      label: 'Rôle responsable',
      placeholder: 'Ex. Équipe de direction',
      knowledge: task.details.role.knowledge,
    },
    {
      key: 'tool',
      label: 'Outil utilisé',
      placeholder: 'Ex. Tableur partagé',
      knowledge: task.details.tools.knowledge,
    },
    {
      key: 'input',
      label: 'Information en entrée',
      placeholder: 'Ex. Analyse validée',
      knowledge: task.details.inputs.knowledge,
    },
    {
      key: 'output',
      label: 'Résultat en sortie',
      placeholder: 'Ex. Diagnostic présenté',
      knowledge: task.details.outputs.knowledge,
    },
  ];
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
        <button
          className="primary"
          disabled={busy || base !== revision || !label.trim() || label.trim() === task.label}
        >
          Enregistrer le libellé
        </button>
      </form>
      <div className="inspector-divider" />
      <form
        className="task-form details-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (await onSaveDetails(details, base)) setBase(base + 1);
        }}
      >
        <div className="form-section-heading">
          <strong>Contexte métier</strong>
          <span>Les valeurs saisies restent à confirmer.</span>
        </div>
        {fields.map((field) => (
          <div className="detail-field" key={field.key}>
            <div className="detail-label">
              <label htmlFor={`task-${field.key}`}>{field.label}</label>
              <span data-knowledge={field.knowledge}>{knowledgeLabel[field.knowledge]}</span>
            </div>
            <input
              id={`task-${field.key}`}
              value={details[field.key]}
              maxLength={160}
              placeholder={field.placeholder}
              onChange={(event) =>
                setDetails((current) => ({ ...current, [field.key]: event.target.value }))
              }
            />
          </div>
        ))}
        {base !== revision && (
          <p>
            La carte a été actualisée. Votre saisie est conservée.
            <button type="button" className="secondary" onClick={() => setBase(revision)}>
              Utiliser cette révision
            </button>
          </p>
        )}
        <button className="primary" disabled={busy || base !== revision || !detailsChanged}>
          Enregistrer la fiche
        </button>
      </form>
      <dl>
        <dt>Origine</dt>
        <dd>Exemple synthétique</dd>
      </dl>
    </aside>
  );
}
