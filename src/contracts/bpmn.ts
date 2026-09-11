export type BpmnNodeType =
  | 'startEvent'
  | 'endEvent'
  | 'task'
  | 'userTask'
  | 'manualTask'
  | 'serviceTask'
  | 'exclusiveGateway'
  | 'parallelGateway'
  | 'subprocess'
  | 'textAnnotation'
  | 'dataObject'
  | 'dataStore';

export type BpmnFlowType = 'sequenceFlow' | 'messageFlow' | 'association';

export type BpmnParticipant = {
  id: string;
  label: string;
  process_id: string;
};

export type BpmnLane = {
  id: string;
  label: string;
  participant_id: string;
};

export type BpmnNode = {
  id: string;
  type: BpmnNodeType;
  label: string;
  process_id: string;
  participant_id: string;
  lane_id?: string;
  parent_subprocess_id: string | null;
  position: { x: number; y: number };
  collapsed?: boolean;
  execution?: 'disabled';
};

export type BpmnFlow = {
  id: string;
  type: BpmnFlowType;
  source_id: string;
  target_id: string;
  condition?: string;
};

export type BpmnView = {
  open_process_id: string;
  breadcrumb_ids: string[];
  selected_id?: string;
  zoom: number;
};

export type BpmnDocument = {
  id: string;
  dossier_id: string;
  model_id: string;
  name: string;
  revision: number;
  status: 'draft';
  participants: BpmnParticipant[];
  lanes: BpmnLane[];
  nodes: BpmnNode[];
  flows: BpmnFlow[];
  view: BpmnView;
};

export type BpmnOperation =
  | { type: 'ADD_NODE'; node: BpmnNode }
  | { type: 'ADD_FLOW'; flow: BpmnFlow }
  | { type: 'TOGGLE_SUBPROCESS'; subprocess_id: string; collapsed: boolean }
  | {
      type: 'SET_VIEW';
      open_process_id: string;
      breadcrumb_ids: string[];
      selected_id?: string;
      zoom: number;
    };

export type BpmnCommand = {
  command_id: string;
  base_revision: number;
  operations: BpmnOperation[];
};

export type BpmnResult = {
  status: 'applied' | 'rejected' | 'conflict';
  code?: string;
  message?: string;
  document?: BpmnDocument;
};

export type BpmnAnomaly = {
  code: 'MISSING_START_EVENT' | 'MISSING_END_EVENT';
  process_id: string;
  element_id: string | null;
  message: string;
};

export type BpmnValidation = {
  valid_for_export: boolean;
  anomalies: BpmnAnomaly[];
};
