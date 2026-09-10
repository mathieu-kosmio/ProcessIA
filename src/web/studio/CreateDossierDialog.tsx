import { useState } from 'react';
import type { Dossier } from '../../contracts/model.ts';

export function CreateDossierDialog({
  busy,
  onCancel,
  onCreate,
}: {
  busy: boolean;
  onCancel: () => void;
  onCreate: (input: { name: string; activity: string | null }) => Promise<Dossier>;
}) {
  const [name, setName] = useState('');
  const [activity, setActivity] = useState('');
  return (
    <div className="dialog-backdrop" onMouseDown={onCancel}>
      <section
        className="dialog-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-dossier-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="inspector-heading">
          <span>NOUVEAU DOSSIER</span>
          <button aria-label="Fermer" onClick={onCancel}>
            ×
          </button>
        </div>
        <h2 id="create-dossier-title">Préparer un espace de travail</h2>
        <p>Le dossier commence dans votre préparation privée. L’activité peut rester à préciser.</p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            await onCreate({ name: name.trim(), activity: activity.trim() || null });
          }}
        >
          <label htmlFor="dossier-name">Nom du dossier</label>
          <input
            id="dossier-name"
            autoFocus
            required
            maxLength={160}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <label htmlFor="dossier-activity">Activité</label>
          <input
            id="dossier-activity"
            maxLength={500}
            value={activity}
            placeholder="À préciser"
            onChange={(event) => setActivity(event.target.value)}
          />
          <div className="dialog-actions">
            <button type="button" className="secondary" onClick={onCancel} disabled={busy}>
              Annuler
            </button>
            <button className="primary" disabled={busy || !name.trim()}>
              {busy ? 'Création…' : 'Créer et ouvrir'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
