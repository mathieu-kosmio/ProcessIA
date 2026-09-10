import type { Model } from '../../contracts/model.ts';

const emptyReference = () => ({ ids: [], knowledge: 'unset' as const });
const taskDetails = (roleId?: string) => ({
  role: roleId ? { ids: [roleId], knowledge: 'proposed' as const } : emptyReference(),
  tools: emptyReference(),
  inputs: emptyReference(),
  outputs: emptyReference(),
});

// Données synthétiques : aucune description confirmée des pratiques de Kosmio.
export const initialModel: Model = {
  id: 'process-diagnostic',
  dossier_id: 'demo-kosmio',
  name: 'Réaliser un diagnostic IA',
  revision: 0,
  visibility: 'private',
  roles: [{ id: 'role-consultant', label: 'Consultant' }],
  tools: [],
  information: [],
  tasks: [
    {
      id: 'task-preparation',
      label: 'Préparer le dossier',
      position: { x: 70, y: 80 },
      knowledge: 'proposed',
      role: 'Consultant',
      details: taskDetails('role-consultant'),
    },
    {
      id: 'task-entretien',
      label: 'Conduire l’entretien',
      position: { x: 400, y: 80 },
      knowledge: 'proposed',
      role: 'Consultant',
      details: taskDetails('role-consultant'),
    },
    {
      id: 'task-modelisation',
      label: 'Modéliser le fonctionnement',
      position: { x: 730, y: 80 },
      knowledge: 'proposed',
      role: 'Consultant',
      details: taskDetails('role-consultant'),
    },
    {
      id: 'task-opportunites',
      label: 'Identifier les opportunités',
      position: { x: 730, y: 400 },
      knowledge: 'proposed',
      role: 'Consultant',
      details: taskDetails('role-consultant'),
    },
    {
      id: 'task-priorisation',
      label: 'Prioriser les améliorations',
      position: { x: 400, y: 400 },
      knowledge: 'proposed',
      role: null,
      details: taskDetails(),
    },
    {
      id: 'task-restitution',
      label: 'Restituer le diagnostic',
      position: { x: 70, y: 400 },
      knowledge: 'proposed',
      role: 'Consultant',
      details: taskDetails('role-consultant'),
    },
  ],
  links: [
    ['preparation', 'entretien'],
    ['entretien', 'modelisation'],
    ['modelisation', 'opportunites'],
    ['opportunites', 'priorisation'],
    ['priorisation', 'restitution'],
  ].map(([a, b]) => ({
    id: `flow-${a}-${b}`,
    source: `task-${a}`,
    target: `task-${b}`,
    type: 'sequence',
  })),
};
