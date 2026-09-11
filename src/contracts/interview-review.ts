export type ReviewSubject = {
  kind: 'task_property' | 'flow_property';
  element_id: string;
  property: string;
  label: string;
};

export type TestimonyReference = {
  source_id: string;
  source_version: number;
  passage_id: string;
};

export type TargetRole = {
  role_id: string;
  label: string;
};

export type ConsolidateTestimoniesInput = {
  idempotency_key: string;
  model_id: string;
  subject: ReviewSubject;
  testimonies: TestimonyReference[];
  target_role: TargetRole;
};

export type TestimonyAssertion = {
  assertion_id: string;
  value: string;
  knowledge: 'proposed';
  provenance: TestimonyReference & {
    source_title: string;
    source_date: string | null;
  };
};

export type ClarificationProposal = {
  target_role: TargetRole;
  target_person: null;
  question: string;
  rationale: string;
  status: 'proposed';
};

export type InterviewInvestigation = {
  investigation_id: string;
  dossier_id: string;
  model_id: string;
  kind: 'divergence';
  status: 'open';
  subject: ReviewSubject;
  assertions: TestimonyAssertion[];
  clarification: ClarificationProposal;
  resolution: null;
  created_at: string;
};
