import type { KnowledgeState } from './model.ts';

export type ModelProvenance = {
  kind: 'model_revision';
  revision: number;
  element_id: string;
  confirmed_by?: string;
  confirmed_at?: string;
};

export type SourcePassageProvenance = {
  kind: 'source_passage';
  source_id: string;
  source_version: number;
  passage_id: string;
};

export type RoleSnapshot = {
  role_id: string | null;
  label: string | null;
  knowledge: KnowledgeState;
};

export type RoleEnrichment = {
  enrichment_id: string;
  dossier_id: string;
  model_id: string;
  base_revision: number;
  task_id: string;
  field: 'role';
  status: 'proposed' | 'divergence' | 'rejected' | 'accepted';
  current: RoleSnapshot & { provenance: ModelProvenance };
  proposed: {
    role_id: string;
    label: string;
    knowledge: 'proposed';
    provenance: SourcePassageProvenance;
  };
  preview: {
    field: 'role';
    before: RoleSnapshot;
    after: RoleSnapshot;
  };
  rejection_reason?: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  applied_revision?: number;
};

export type ProposeRoleInput = {
  model_id: string;
  task_id: string;
  source_id: string;
  source_version: number;
  passage_id: string;
  proposed_role: { role_id: string; label: string };
};
