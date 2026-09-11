import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyBpmnCommand, validateBpmnDraft } from '../../src/domain/bpmn/profile.ts';
import type { BpmnDocument } from '../../src/contracts/bpmn.ts';

const baseDocument = (): BpmnDocument => ({
  id: 'bpmn-diagnostic',
  dossier_id: 'demo-kosmio',
  model_id: 'process-diagnostic',
  name: 'Processus de diagnostic',
  revision: 0,
  status: 'draft',
  participants: [
    { id: 'participant-consultant', label: 'Cabinet conseil', process_id: 'process-consultant' },
    { id: 'participant-client', label: 'Entreprise cliente', process_id: 'process-client' },
  ],
  lanes: [
    { id: 'lane-consultant', label: 'Consultant', participant_id: 'participant-consultant' },
    { id: 'lane-expert', label: 'Expert', participant_id: 'participant-consultant' },
    { id: 'lane-direction', label: 'Direction', participant_id: 'participant-client' },
  ],
  nodes: [
    {
      id: 'start-consultant',
      type: 'startEvent',
      label: 'Demande reçue',
      process_id: 'process-consultant',
      participant_id: 'participant-consultant',
      lane_id: 'lane-consultant',
      parent_subprocess_id: null,
      position: { x: 40, y: 80 },
    },
    {
      id: 'task-cadrage',
      type: 'userTask',
      label: 'Cadrer la mission',
      process_id: 'process-consultant',
      participant_id: 'participant-consultant',
      lane_id: 'lane-consultant',
      parent_subprocess_id: null,
      position: { x: 220, y: 80 },
    },
    {
      id: 'task-analyse',
      type: 'serviceTask',
      label: 'Analyser les données',
      process_id: 'process-consultant',
      participant_id: 'participant-consultant',
      lane_id: 'lane-expert',
      parent_subprocess_id: null,
      position: { x: 400, y: 180 },
      execution: 'disabled',
    },
    {
      id: 'subprocess-restitution',
      type: 'subprocess',
      label: 'Préparer la restitution',
      process_id: 'process-consultant',
      participant_id: 'participant-consultant',
      lane_id: 'lane-consultant',
      parent_subprocess_id: null,
      position: { x: 580, y: 80 },
      collapsed: true,
    },
    ...['synthese', 'revue', 'support'].map((id, index) => ({
      id: `task-${id}`,
      type: 'manualTask' as const,
      label: ['Rédiger la synthèse', 'Relire les constats', 'Préparer le support'][index],
      process_id: 'process-consultant',
      participant_id: 'participant-consultant',
      lane_id: 'lane-consultant',
      parent_subprocess_id: 'subprocess-restitution',
      position: { x: 120 + index * 180, y: 320 },
    })),
    {
      id: 'end-consultant',
      type: 'endEvent',
      label: 'Restitution prête',
      process_id: 'process-consultant',
      participant_id: 'participant-consultant',
      lane_id: 'lane-consultant',
      parent_subprocess_id: null,
      position: { x: 780, y: 80 },
    },
    {
      id: 'task-validation-client',
      type: 'userTask',
      label: 'Valider les constats',
      process_id: 'process-client',
      participant_id: 'participant-client',
      lane_id: 'lane-direction',
      parent_subprocess_id: null,
      position: { x: 580, y: 500 },
    },
  ],
  flows: [],
  view: {
    open_process_id: 'process-consultant',
    breadcrumb_ids: ['bpmn-diagnostic', 'process-consultant'],
    selected_id: 'subprocess-restitution',
    zoom: 1.2,
  },
});

test('T008 / TC-023 : une séquence traverse deux couloirs du même participant', () => {
  const result = applyBpmnCommand(baseDocument(), {
    command_id: 'sequence-same-participant',
    base_revision: 0,
    operations: [
      {
        type: 'ADD_FLOW',
        flow: {
          id: 'flow-cadrage-analyse',
          type: 'sequenceFlow',
          source_id: 'task-cadrage',
          target_id: 'task-analyse',
        },
      },
    ],
  });
  assert.equal(result.status, 'applied');
  assert.equal(result.document?.flows[0].type, 'sequenceFlow');
  assert.equal(result.document?.revision, 1);
});

test('T008 / TC-023 : une séquence entre participants est refusée avec une suggestion explicite', () => {
  const result = applyBpmnCommand(baseDocument(), {
    command_id: 'invalid-cross-participant',
    base_revision: 0,
    operations: [
      {
        type: 'ADD_FLOW',
        flow: {
          id: 'flow-invalid',
          type: 'sequenceFlow',
          source_id: 'task-cadrage',
          target_id: 'task-validation-client',
        },
      },
    ],
  });
  assert.equal(result.status, 'rejected');
  assert.equal(result.code, 'CROSS_PARTICIPANT_SEQUENCE');
  assert.match(result.message ?? '', /messageFlow/);
  assert.equal(result.document, undefined);
});

test('T008 / TC-023 : un flux de message relie deux participants et reste interdit en interne', () => {
  const external = applyBpmnCommand(baseDocument(), {
    command_id: 'message-external',
    base_revision: 0,
    operations: [
      {
        type: 'ADD_FLOW',
        flow: {
          id: 'message-constats',
          type: 'messageFlow',
          source_id: 'subprocess-restitution',
          target_id: 'task-validation-client',
        },
      },
    ],
  });
  assert.equal(external.status, 'applied');

  const internal = applyBpmnCommand(baseDocument(), {
    command_id: 'message-internal',
    base_revision: 0,
    operations: [
      {
        type: 'ADD_FLOW',
        flow: {
          id: 'message-invalid',
          type: 'messageFlow',
          source_id: 'task-cadrage',
          target_id: 'task-analyse',
        },
      },
    ],
  });
  assert.equal(internal.status, 'rejected');
  assert.equal(internal.code, 'INTERNAL_MESSAGE_FLOW');
});

test('T008 / TC-023 : une association de données ne devient pas une séquence', () => {
  const document = baseDocument();
  document.nodes.push({
    id: 'data-diagnostic',
    type: 'dataObject',
    label: 'Données du diagnostic',
    process_id: 'process-consultant',
    participant_id: 'participant-consultant',
    lane_id: 'lane-expert',
    parent_subprocess_id: null,
    position: { x: 480, y: 260 },
  });
  const result = applyBpmnCommand(document, {
    command_id: 'invalid-data-sequence',
    base_revision: 0,
    operations: [
      {
        type: 'ADD_FLOW',
        flow: {
          id: 'flow-data-task',
          type: 'sequenceFlow',
          source_id: 'data-diagnostic',
          target_id: 'task-analyse',
        },
      },
    ],
  });
  assert.equal(result.status, 'rejected');
  assert.equal(result.code, 'INVALID_FLOW_NODE');
});

test('T008 / TC-022 : replier et déplier un sous-processus conserve son contenu et la vue', () => {
  const original = baseDocument();
  const expanded = applyBpmnCommand(original, {
    command_id: 'expand-subprocess',
    base_revision: 0,
    operations: [
      { type: 'TOGGLE_SUBPROCESS', subprocess_id: 'subprocess-restitution', collapsed: false },
      {
        type: 'SET_VIEW',
        open_process_id: 'process-consultant',
        breadcrumb_ids: ['bpmn-diagnostic', 'process-consultant', 'subprocess-restitution'],
        selected_id: 'task-revue',
        zoom: 1.5,
      },
    ],
  });
  assert.equal(expanded.status, 'applied');
  assert.equal(
    expanded.document?.nodes.find((node) => node.id === 'subprocess-restitution')?.collapsed,
    false,
  );
  assert.equal(
    expanded.document?.nodes.filter(
      (node) => node.parent_subprocess_id === 'subprocess-restitution',
    ).length,
    3,
  );
  assert.deepEqual(expanded.document?.view, {
    open_process_id: 'process-consultant',
    breadcrumb_ids: ['bpmn-diagnostic', 'process-consultant', 'subprocess-restitution'],
    selected_id: 'task-revue',
    zoom: 1.5,
  });
});

test('T008 / frontière de sous-processus : un lien interne ne traverse pas directement son parent', () => {
  const result = applyBpmnCommand(baseDocument(), {
    command_id: 'cross-subprocess-boundary',
    base_revision: 0,
    operations: [
      {
        type: 'ADD_FLOW',
        flow: {
          id: 'flow-invalid-boundary',
          type: 'sequenceFlow',
          source_id: 'task-support',
          target_id: 'end-consultant',
        },
      },
    ],
  });
  assert.equal(result.status, 'rejected');
  assert.equal(result.code, 'SUBPROCESS_BOUNDARY');
});

test('T008 / TC-022 : une serviceTask décrit une intention sans exécution', () => {
  const result = applyBpmnCommand(baseDocument(), {
    command_id: 'add-service-task',
    base_revision: 0,
    operations: [
      {
        type: 'ADD_NODE',
        node: {
          id: 'task-preparer-indicateurs',
          type: 'serviceTask',
          label: 'Préparer les indicateurs',
          process_id: 'process-consultant',
          participant_id: 'participant-consultant',
          lane_id: 'lane-expert',
          parent_subprocess_id: null,
          position: { x: 480, y: 180 },
        },
      },
    ],
  });
  assert.equal(result.status, 'applied');
  assert.equal(
    result.document?.nodes.find((node) => node.id === 'task-preparer-indicateurs')?.execution,
    'disabled',
  );
});

test('T008 / TC-023 : un brouillon incomplet est conservé avec des anomalies localisées', () => {
  const document = baseDocument();
  document.nodes = document.nodes.filter((node) => node.type !== 'endEvent');
  const validation = validateBpmnDraft(document);
  assert.equal(validation.valid_for_export, false);
  assert.deepEqual(validation.anomalies, [
    {
      code: 'MISSING_END_EVENT',
      process_id: 'process-consultant',
      element_id: null,
      message: 'Le processus process-consultant ne possède aucun événement de fin.',
    },
    {
      code: 'MISSING_START_EVENT',
      process_id: 'process-client',
      element_id: null,
      message: 'Le processus process-client ne possède aucun événement de début.',
    },
    {
      code: 'MISSING_END_EVENT',
      process_id: 'process-client',
      element_id: null,
      message: 'Le processus process-client ne possède aucun événement de fin.',
    },
  ]);
  assert.equal(document.status, 'draft');
});

test('T008 / TC-025 : une commande fondée sur une ancienne révision reste sans effet', () => {
  const document = baseDocument();
  document.revision = 3;
  const result = applyBpmnCommand(document, {
    command_id: 'stale-bpmn-change',
    base_revision: 2,
    operations: [
      { type: 'TOGGLE_SUBPROCESS', subprocess_id: 'subprocess-restitution', collapsed: false },
    ],
  });
  assert.equal(result.status, 'conflict');
  assert.equal(result.code, 'REVISION_CONFLICT');
  assert.equal(
    document.nodes.find((node) => node.id === 'subprocess-restitution')?.collapsed,
    true,
  );
});
