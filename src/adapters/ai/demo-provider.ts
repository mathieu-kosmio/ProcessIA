import type { LanguageProvider } from '../../application/interviews/propose.ts';
import { randomUUID } from 'node:crypto';

export const demoProvider: LanguageProvider = {
  async propose(model, text, selectedId) {
    const normalized = text
      .trim()
      .toLocaleLowerCase('fr')
      .replace(/[.!?]+$/, '');
    const selectedTask = model.tasks.find((task) => task.id === selectedId);
    if (normalized.startsWith('ici nous utilisons un modèle')) {
      if (!selectedTask)
        return {
          clarification:
            'Quelle tâche est concernée par ce modèle ? Sélectionnez-la puis reformulez.',
        };
      const specifiedLabel = text
        .trim()
        .match(/modèle\s+(.+?)[.!?]*$/i)?.[1]
        ?.trim();
      const label = specifiedLabel ? `Modèle ${specifiedLabel}` : 'Modèle à préciser';
      const informationId = `information-template-${selectedTask.id}`;
      return {
        operations: [
          {
            type: 'UPSERT_INFORMATION',
            information_id: informationId,
            label,
            category: 'template',
          },
          {
            type: 'LINK_INFORMATION',
            task_id: selectedTask.id,
            direction: 'input',
            information_ids: [informationId],
            knowledge: 'to_confirm',
          },
        ],
      };
    }

    let target: string | undefined;
    let relation: 'before_id' | 'after_id' = 'before_id';
    if (normalized === 'ajoute une validation avant la restitution')
      target = model.tasks.find((task) => task.id === 'task-restitution')?.id;
    if (normalized === 'ajoute une validation avant cette tâche') target = selectedTask?.id;
    if (normalized === 'ajoute une validation après cette tâche') {
      target = selectedTask?.id;
      relation = 'after_id';
    }
    if (!target)
      return {
        clarification:
          'Précisez la tâche concernée. La démonstration peut ajouter une validation avant ou après une tâche sélectionnée, ou rattacher un modèle à la sélection.',
      };
    return {
      operations: [
        {
          type: 'ADD_TASK',
          task_id: randomUUID(),
          label: relation === 'after_id' ? 'Valider le modèle' : 'Valider les recommandations',
          [relation]: target,
        },
      ],
    };
  },
};
