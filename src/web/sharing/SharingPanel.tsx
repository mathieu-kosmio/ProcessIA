import { useEffect, useState } from 'react';
import type { SourceSummary } from '../../contracts/source.ts';

type SourceStatus = {
  source_id: string;
  version: number;
  passages: Array<{
    passage_id: string;
    ordinal: number;
    text: string;
  }>;
};

type Preview = {
  preview_id: string;
  shared_text: string;
  source_version: number;
  state: 'preview';
};

type SharedItem = {
  publication_id: string;
  text: string;
  version: number;
  published_at: string;
  provenance: {
    kind: 'private_source';
    details_available: boolean;
    source_title?: string;
  };
};

async function request<T>(path: string, method = 'GET', payload?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: payload ? { 'Content-Type': 'application/json' } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message ?? 'La demande de partage a échoué.');
  return result;
}

export function SharingPanel({ dossierId, onClose }: { dossierId: string; onClose: () => void }) {
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [source, setSource] = useState<SourceStatus>();
  const [passageId, setPassageId] = useState('');
  const [sharedText, setSharedText] = useState('');
  const [preview, setPreview] = useState<Preview>();
  const [published, setPublished] = useState<SharedItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function loadSource(sourceId: string) {
    const next = await request<SourceStatus>(
      `/api/dossiers/${dossierId}/sources/${sourceId}/status`,
    );
    setSource(next);
    setPassageId(next.passages[0]?.passage_id ?? '');
  }

  async function refresh() {
    const [sourceList, sharedList] = await Promise.all([
      request<{ items: SourceSummary[] }>(`/api/dossiers/${dossierId}/sources`),
      request<{ items: SharedItem[] }>(`/api/dossiers/${dossierId}/shared-knowledge`),
    ]);
    setSources(sourceList.items);
    setPublished(sharedList.items);
    if (sourceList.items[0]) await loadSource(sourceList.items[0].source_id);
  }

  useEffect(() => {
    refresh().catch((reason) => setError((reason as Error).message));
  }, [dossierId]);

  async function preparePreview() {
    if (!source || !passageId || !sharedText.trim()) return;
    setBusy(true);
    setError('');
    try {
      setPreview(
        await request<Preview>(`/api/dossiers/${dossierId}/sharing/previews`, 'POST', {
          source_id: source.source_id,
          source_version: source.version,
          passage_id: passageId,
          shared_text: sharedText,
        }),
      );
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmPreview() {
    if (!preview) return;
    setBusy(true);
    setError('');
    try {
      await request(`/api/dossiers/${dossierId}/sharing/publications`, 'POST', {
        preview_id: preview.preview_id,
        idempotency_key: crypto.randomUUID(),
      });
      setPreview(undefined);
      setSharedText('');
      const result = await request<{ items: SharedItem[] }>(
        `/api/dossiers/${dossierId}/shared-knowledge`,
      );
      setPublished(result.items);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelPreview() {
    if (!preview) return;
    setBusy(true);
    try {
      await request(
        `/api/dossiers/${dossierId}/sharing/previews/${preview.preview_id}/cancel`,
        'POST',
        {},
      );
      setPreview(undefined);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(item: SharedItem) {
    setBusy(true);
    setError('');
    try {
      await request(
        `/api/dossiers/${dossierId}/shared-knowledge/${item.publication_id}/revoke`,
        'POST',
        { base_version: item.version },
      );
      setPublished((current) =>
        current.filter((entry) => entry.publication_id !== item.publication_id),
      );
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const passage = source?.passages.find((item) => item.passage_id === passageId);
  return (
    <aside className="inspector sharing-panel" aria-label="Sources et partage">
      <div className="inspector-heading">
        <span>SOURCES & PARTAGE</span>
        <button aria-label="Fermer les sources et le partage" onClick={onClose}>
          ×
        </button>
      </div>
      <h2>Partager une formulation</h2>
      <p className="muted">
        La source et son extrait restent privés. Seul le texte prévisualisé devient visible.
      </p>

      {error && (
        <p className="sharing-error" role="alert">
          {error}
        </p>
      )}
      {sources.length === 0 ? (
        <p className="empty-state">Ajoutez d’abord une source textuelle avec le serveur MCP.</p>
      ) : (
        <div className="sharing-form">
          <label>
            Source privée
            <select
              value={source?.source_id ?? ''}
              disabled={busy}
              onChange={(event) =>
                loadSource(event.target.value).catch((reason) => setError(reason.message))
              }
            >
              {sources.map((item) => (
                <option key={item.source_id} value={item.source_id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Passage justificatif
            <select
              value={passageId}
              disabled={busy}
              onChange={(event) => setPassageId(event.target.value)}
            >
              {source?.passages.map((item) => (
                <option key={item.passage_id} value={item.passage_id}>
                  Passage {item.ordinal}
                </option>
              ))}
            </select>
          </label>
          {passage && <blockquote data-testid="private-passage">{passage.text}</blockquote>}
          <label>
            Formulation partagée
            <textarea
              value={sharedText}
              rows={4}
              maxLength={2000}
              placeholder="Rédigez ce que le responsable pourra lire."
              disabled={busy || Boolean(preview)}
              onChange={(event) => setSharedText(event.target.value)}
            />
          </label>
          <button
            className="primary sharing-action"
            disabled={busy || !sharedText.trim() || Boolean(preview)}
            onClick={preparePreview}
          >
            Prévisualiser le partage
          </button>
        </div>
      )}

      {preview && (
        <div className="share-preview" role="status">
          <span>APERÇU RESPONSABLE</span>
          <p>{preview.shared_text}</p>
          <small>Aucune référence privée ne sera affichée.</small>
          <div>
            <button className="secondary" disabled={busy} onClick={cancelPreview}>
              Annuler
            </button>
            <button className="primary" disabled={busy} onClick={confirmPreview}>
              Confirmer le partage
            </button>
          </div>
        </div>
      )}

      <div className="shared-list" data-testid="shared-projection">
        <div className="shared-list-heading">
          <strong>Déjà partagé</strong>
          <span>{published.length}</span>
        </div>
        {published.length === 0 && <p className="empty-state">Aucune formulation partagée.</p>}
        {published.map((item) => (
          <article key={item.publication_id}>
            <p>{item.text}</p>
            <small>Source privée · détails visibles ici uniquement</small>
            <button disabled={busy} onClick={() => revoke(item)}>
              Retirer le partage
            </button>
          </article>
        ))}
      </div>
    </aside>
  );
}
