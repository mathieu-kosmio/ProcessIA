export type DiagnosticScope = {
  label: string;
  task_ids: string[];
  coverage_limit: string;
};

export type DiagnosticFindingInput = {
  finding_id: string;
  statement: string;
  kind:
    'declared_fact' | 'confirmed_fact' | 'interpretation' | 'hypothesis' | 'missing_information';
  task_ids: string[];
  investigation_id: string;
};

export type CriterionAssessmentInput = {
  value: number | null;
  justification: string;
  confidence: 'unknown' | 'to_confirm' | 'confirmed';
};

export type CriterionAssessment = CriterionAssessmentInput & {
  label: 'Inconnue' | '1' | '2' | '3' | '4' | '5';
};

export type OpportunityPrerequisite = {
  prerequisite_id: string;
  label: string;
  status: 'met' | 'missing' | 'unknown';
  impact: string;
  completion_criterion: string;
};

export type OpportunityInput = {
  opportunity_id: string;
  title: string;
  type: 'organization' | 'automation' | 'ai';
  beneficiary: string;
  expected_value: CriterionAssessmentInput;
  feasibility: CriterionAssessmentInput;
  prerequisites: OpportunityPrerequisite[];
  priority: {
    level: 'high' | 'medium' | 'low' | 'unknown';
    rationale: string;
    status: 'proposed';
  };
  human_owner: { role_id: string; label: string };
  experiment: {
    hypothesis: string;
    protocol: string;
    success_criteria: string[];
  };
};

export type CreateDiagnosticInput = {
  idempotency_key: string;
  model_id: string;
  scope: DiagnosticScope;
  finding: DiagnosticFindingInput;
  opportunity: OpportunityInput;
};

export type DiagnosticOpportunity = OpportunityInput & {
  finding_id: string;
  expected_value: CriterionAssessment;
  feasibility: CriterionAssessment;
  score: null;
  score_explanation: string;
  execution: 'not_started';
};

export type RoadmapAction = {
  action_id: string;
  kind: 'prerequisite' | 'experiment';
  title: string;
  responsible_role: { role_id: string; label: string };
  depends_on: string[];
  effort: null;
  effort_label: 'À estimer';
  exit_criteria: string[];
  status: 'proposed';
};

export type Diagnostic = {
  diagnostic_id: string;
  dossier_id: string;
  model_id: string;
  based_on_revision: number;
  status: 'draft';
  scope: DiagnosticScope;
  findings: DiagnosticFindingInput[];
  opportunities: DiagnosticOpportunity[];
  roadmap: { actions: RoadmapAction[] };
  estimated_gain: {
    status: 'unknown';
    value: null;
    label: 'À mesurer';
  };
  created_at: string;
};
