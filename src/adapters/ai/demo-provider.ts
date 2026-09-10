import type { LanguageProvider } from '../../application/interviews/propose.ts';
import { randomUUID } from 'node:crypto';

export const demoProvider: LanguageProvider = {
  async propose(model, text, selectedId) {
    const normalized = text
      .trim()
      .toLocaleLowerCase('fr')
      .replace(/[.!?]+$/, '');
    let target: string | undefined;
    if (normalized === 'ajoute une validation avant la restitution')
      target = model.tasks.find((task) => task.id === 'task-restitution')?.id;
    if (normalized === 'ajoute une validation avant cette tâche')
      target = model.tasks.find((task) => task.id === selectedId)?.id;
    if (!target)
      return {
        clarification:
          'Cette démonstration reconnaît « Ajoute une validation avant la restitution » ou « Ajoute une validation avant cette tâche » avec une sélection. Vous pouvez aussi modifier la carte directement.',
      };
    return {
      operations: [
        {
          type: 'ADD_TASK',
          task_id: randomUUID(),
          label: 'Valider les recommandations',
          before_id: target,
        },
      ],
    };
  },
};
