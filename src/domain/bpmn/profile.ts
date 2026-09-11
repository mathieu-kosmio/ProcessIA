import type {
  BpmnCommand,
  BpmnDocument,
  BpmnFlow,
  BpmnNode,
  BpmnResult,
  BpmnValidation,
} from '../../contracts/bpmn.ts';

const supportedNodeTypes = new Set<BpmnNode['type']>([
  'startEvent',
  'endEvent',
  'task',
  'userTask',
  'manualTask',
  'serviceTask',
  'exclusiveGateway',
  'parallelGateway',
  'subprocess',
  'textAnnotation',
  'dataObject',
  'dataStore',
]);
const flowNodeTypes = new Set<BpmnNode['type']>([
  'startEvent',
  'endEvent',
  'task',
  'userTask',
  'manualTask',
  'serviceTask',
  'exclusiveGateway',
  'parallelGateway',
  'subprocess',
]);

export function applyBpmnCommand(current: BpmnDocument, command: BpmnCommand): BpmnResult {
  if (current.revision !== command.base_revision)
    return {
      status: 'conflict',
      code: 'REVISION_CONFLICT',
      message: 'Le diagramme a changé. Rechargez-le avant de revoir cette modification.',
    };
  if (!command.command_id || command.operations.length === 0)
    return rejected('INVALID_OPERATION', 'La commande BPMN est vide ou invalide.');

  const document = structuredClone(current);
  for (const operation of command.operations) {
    if (operation.type === 'ADD_NODE') {
      const error = validateNode(document, operation.node);
      if (error) return error;
      document.nodes.push({
        ...operation.node,
        ...(operation.node.type === 'serviceTask' ? { execution: 'disabled' as const } : {}),
        ...(operation.node.type === 'subprocess'
          ? { collapsed: operation.node.collapsed ?? true }
          : {}),
      });
      continue;
    }
    if (operation.type === 'ADD_FLOW') {
      const error = validateFlow(document, operation.flow);
      if (error) return error;
      document.flows.push(operation.flow);
      continue;
    }
    if (operation.type === 'TOGGLE_SUBPROCESS') {
      const subprocess = document.nodes.find(
        (node) => node.id === operation.subprocess_id && node.type === 'subprocess',
      );
      if (!subprocess)
        return rejected('INVALID_TARGET', 'Le sous-processus ciblé est indisponible.');
      subprocess.collapsed = operation.collapsed;
      continue;
    }
    const processExists = document.participants.some(
      (participant) => participant.process_id === operation.open_process_id,
    );
    const selectionExists =
      !operation.selected_id || document.nodes.some((node) => node.id === operation.selected_id);
    const knownBreadcrumbs = new Set([
      document.id,
      ...document.participants.map((participant) => participant.process_id),
      ...document.nodes.filter((node) => node.type === 'subprocess').map((node) => node.id),
    ]);
    if (
      !processExists ||
      !selectionExists ||
      operation.zoom < 0.25 ||
      operation.zoom > 4 ||
      operation.breadcrumb_ids.some((id) => !knownBreadcrumbs.has(id))
    )
      return rejected('INVALID_VIEW', 'La vue BPMN contient une cible ou un zoom invalide.');
    document.view = {
      open_process_id: operation.open_process_id,
      breadcrumb_ids: operation.breadcrumb_ids,
      ...(operation.selected_id ? { selected_id: operation.selected_id } : {}),
      zoom: operation.zoom,
    };
  }
  document.revision += 1;
  return { status: 'applied', document };
}

function validateNode(document: BpmnDocument, node: BpmnNode): BpmnResult | undefined {
  if (!supportedNodeTypes.has(node.type))
    return rejected('UNSUPPORTED_BPMN_TYPE', 'Ce type ne fait pas partie du profil BPMN V1.');
  if (allIds(document).has(node.id))
    return rejected('DUPLICATE_ID', 'Cet identifiant BPMN est déjà utilisé.');
  const participant = document.participants.find((item) => item.id === node.participant_id);
  if (!participant || participant.process_id !== node.process_id)
    return rejected('INVALID_PARTICIPANT', 'Le participant et le processus ne correspondent pas.');
  if (node.lane_id) {
    const lane = document.lanes.find((item) => item.id === node.lane_id);
    if (!lane || lane.participant_id !== node.participant_id)
      return rejected('INVALID_LANE', 'Le couloir ne dépend pas du participant ciblé.');
  }
  if (node.parent_subprocess_id) {
    const parent = document.nodes.find(
      (item) => item.id === node.parent_subprocess_id && item.type === 'subprocess',
    );
    if (
      !parent ||
      parent.process_id !== node.process_id ||
      parent.participant_id !== node.participant_id
    )
      return rejected('INVALID_SUBPROCESS', 'Le sous-processus parent est incompatible.');
  }
  return undefined;
}

function validateFlow(document: BpmnDocument, flow: BpmnFlow): BpmnResult | undefined {
  if (allIds(document).has(flow.id))
    return rejected('DUPLICATE_ID', 'Cet identifiant BPMN est déjà utilisé.');
  const source = document.nodes.find((node) => node.id === flow.source_id);
  const target = document.nodes.find((node) => node.id === flow.target_id);
  if (!source || !target)
    return rejected('INVALID_TARGET', 'La source ou la cible du flux est indisponible.');
  if (flow.type === 'sequenceFlow') {
    if (!flowNodeTypes.has(source.type) || !flowNodeTypes.has(target.type))
      return rejected(
        'INVALID_FLOW_NODE',
        'Un sequenceFlow relie uniquement des événements, tâches, passerelles ou sous-processus.',
      );
    if (source.participant_id !== target.participant_id || source.process_id !== target.process_id)
      return rejected(
        'CROSS_PARTICIPANT_SEQUENCE',
        'Un sequenceFlow reste dans un participant. Proposez un messageFlow à valider.',
      );
    if (source.parent_subprocess_id !== target.parent_subprocess_id)
      return rejected(
        'SUBPROCESS_BOUNDARY',
        'Un flux traversant un sous-processus doit passer par son nœud dans le processus parent.',
      );
  }
  if (flow.type === 'messageFlow' && source.participant_id === target.participant_id)
    return rejected(
      'INTERNAL_MESSAGE_FLOW',
      'Un messageFlow relie deux participants distincts. Utilisez un sequenceFlow en interne.',
    );
  return undefined;
}

function allIds(document: BpmnDocument) {
  return new Set([
    document.id,
    ...document.participants.flatMap((item) => [item.id, item.process_id]),
    ...document.lanes.map((item) => item.id),
    ...document.nodes.map((item) => item.id),
    ...document.flows.map((item) => item.id),
  ]);
}

function rejected(code: string, message: string): BpmnResult {
  return { status: 'rejected', code, message };
}

export function validateBpmnDraft(document: BpmnDocument): BpmnValidation {
  const anomalies: BpmnValidation['anomalies'] = [];
  for (const { process_id } of document.participants) {
    const topLevel = document.nodes.filter(
      (node) => node.process_id === process_id && node.parent_subprocess_id === null,
    );
    if (!topLevel.some((node) => node.type === 'startEvent'))
      anomalies.push({
        code: 'MISSING_START_EVENT',
        process_id,
        element_id: null,
        message: `Le processus ${process_id} ne possède aucun événement de début.`,
      });
    if (!topLevel.some((node) => node.type === 'endEvent'))
      anomalies.push({
        code: 'MISSING_END_EVENT',
        process_id,
        element_id: null,
        message: `Le processus ${process_id} ne possède aucun événement de fin.`,
      });
  }
  return { valid_for_export: anomalies.length === 0, anomalies };
}
