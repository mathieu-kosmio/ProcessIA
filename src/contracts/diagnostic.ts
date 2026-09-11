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

export type PriorityLevel = 'high' | 'medium' | 'low' | 'unknown';

export type DiagnosticPriority = {
  level: PriorityLevel;
  rationale: string;
  status: 'proposed' | 'manual';
};

export type OpportunityInput = {
  opportunity_id: string;
  title: string;
  type: 'organization' | 'automation' | 'ai';
  beneficiary: string;
  expected_value: CriterionAssessmentInput;
  feasibility: CriterionAssessmentInput;
  prerequisites: OpportunityPrerequisite[];
  priority: DiagnosticPriority & { status: 'proposed' };
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

export type DiagnosticOpportunity = Omit<OpportunityInput, 'priority'> & {
  finding_id: string;
  expected_value: CriterionAssessment;
  feasibility: CriterionAssessment;
  priority: DiagnosticPriority;
  score: null;
  score_explanation: string;
  execution: 'not_started';
};

export type RevisePriorityInput = {
  idempotency_key: string;
  base_version: number;
  level: PriorityLevel;
  justification: string;
};

export type DefineGainHypothesisInput = {
  idempotency_key: string;
  base_version: number;
  value: number;
  unit: string;
  method: string;
  estimated_at: string;
};

export type RecordGainMeasurementInput = {
  idempotency_key: string;
  base_version: number;
  value: number;
  unit: string;
  method: string;
  measured_at: string;
};

export type AddAutonomyActionInput = {
  idempotency_key: string;
  base_version: number;
  title: string;
  objective: string;
  target_role: { role_id: string; label: string };
  resource: {
    kind: 'guide' | 'exercise';
    title: string;
    description: string;
  };
  completion_criterion: string;
};

export type GainHypothesis = {
  status: 'hypothesis';
  opportunity_id: string;
  value: number;
  unit: string;
  label: 'Hypothèse initiale';
  method: string;
  estimated_at: string;
  author: string;
  recorded_at: string;
};

export type ObservedGain = {
  measurement_id: string;
  opportunity_id: string;
  value: number;
  unit: string;
  method: string;
  measured_at: string;
  author: string;
  recorded_at: string;
};

export type PriorityHistoryEntry = {
  revision_id: string;
  diagnostic_version: number;
  opportunity_id: string;
  previous: DiagnosticPriority;
  next: DiagnosticPriority;
  actor: string;
  application_role: 'consultant' | 'responsable' | null;
  justification: string;
  changed_at: string;
};

export type RoadmapAction = {
  action_id: string;
  opportunity_id: string;
  kind: 'prerequisite' | 'experiment' | 'autonomy';
  title: string;
  responsible_role: { role_id: string; label: string };
  depends_on: string[];
  effort: null;
  effort_label: 'À estimer';
  exit_criteria: string[];
  status: 'proposed';
  autonomy?: {
    objective: string;
    resource: AddAutonomyActionInput['resource'];
    prepared_by: string;
    created_at: string;
  };
};

export type Diagnostic = {
  diagnostic_id: string;
  dossier_id: string;
  model_id: string;
  based_on_revision: number;
  version: number;
  status: 'draft';
  scope: DiagnosticScope;
  findings: DiagnosticFindingInput[];
  opportunities: DiagnosticOpportunity[];
  roadmap: { actions: RoadmapAction[] };
  estimated_gain:
    | {
        status: 'unknown';
        value: null;
        label: 'À mesurer';
      }
    | GainHypothesis;
  observed_gains: ObservedGain[];
  priority_history: PriorityHistoryEntry[];
  created_at: string;
};

export type TargetChangeInput = {
  change_id: string;
  type: 'update_task_label';
  task_id: string;
  before_label: string;
  after_label: string;
  prepared_by: 'ai' | 'human';
  rationale: string;
};

export type CreateTargetScenarioInput = {
  idempotency_key: string;
  model_id: string;
  base_revision: number;
  name: string;
  changes: TargetChangeInput[];
};

export type TargetValidation = {
  actor: string;
  application_role: 'consultant' | 'responsable' | null;
  justification: string;
  validated_at: string;
};

export type TargetScenario = {
  target_id: string;
  dossier_id: string;
  model_id: string;
  name: string;
  based_on_revision: number;
  version: number;
  status: 'proposed' | 'validated';
  changes: TargetChangeInput[];
  validation: TargetValidation | null;
  created_at: string;
};

export type ValidateTargetScenarioInput = {
  idempotency_key: string;
  base_version: number;
  justification: string;
};

export type TargetComparison = {
  target_id: string;
  name: string;
  based_on_revision: number;
  current_revision: number;
  reference_status: 'current' | 'outdated';
  reconciliation_required: boolean;
  target_status: TargetScenario['status'];
  validation: TargetValidation | null;
  changes: Array<
    TargetChangeInput & {
      reference_value: string;
      current_value: string | null;
      target_value: string;
    }
  >;
};

export type CapabilityUsageBindingInput = {
  usage_id: string;
  label: string;
  context: string;
  task_ids: string[];
  required_scope: 'private' | 'shared';
};

export type CreateCapabilityMapInput = {
  idempotency_key: string;
  model_id: string;
  diagnostic_id: string;
  capability_id: string;
  label: string;
  description: string;
  provider: null;
  execution: 'disabled';
  usage_bindings: CapabilityUsageBindingInput[];
};

export type CapabilityMap = Omit<CreateCapabilityMapInput, 'idempotency_key'> & {
  capability_map_id: string;
  dossier_id: string;
  based_on_model_revision: number;
  based_on_diagnostic_version: number;
  created_by: string;
  created_at: string;
};
