import type { ModelService } from '../model/service.ts';
import type { Model, Session } from '../../contracts/model.ts';
import { commandSchema, type Command } from '../../contracts/model.ts';
import { randomUUID } from 'node:crypto';

export type ProposalInput = {
  dossier_id: string;
  model_id: string;
  base_revision: number;
  text: string;
  selected_id?: string;
};
export type LanguageProvider = {
  propose(model: Model, text: string, selectedId?: string): Promise<unknown>;
};
export type Proposal = {
  status: 'proposed' | 'needs_clarification' | 'rejected' | 'conflict';
  command?: Command;
  message: string;
  code?: string;
};
export async function proposeChanges(
  service: ModelService,
  session: Session,
  input: ProposalInput,
  provider: LanguageProvider,
): Promise<Proposal> {
  const model = service.getModel(session, input.dossier_id, input.model_id, true);
  const conflict: Proposal = {
    status: 'conflict',
    code: 'REVISION_CONFLICT',
    message: 'La carte a changé. Rechargez-la avant de proposer à nouveau.',
  };
  if (model.revision !== input.base_revision) return conflict;
  const response = (await provider.propose(model, input.text, input.selected_id)) as {
    operations?: unknown;
    clarification?: string;
  };
  if (
    service.getModel(session, input.dossier_id, input.model_id, true).revision !==
    input.base_revision
  )
    return conflict;
  if (typeof response?.clarification === 'string')
    return { status: 'needs_clarification', message: response.clarification };
  const parsed = commandSchema.safeParse({
    schema_version: '1',
    command_id: randomUUID(),
    dossier_id: model.dossier_id,
    model_id: model.id,
    base_revision: input.base_revision,
    origin: 'conversation',
    statement: input.text,
    turn_id: randomUUID(),
    operations: response?.operations,
    ...(input.selected_id
      ? { selection_snapshot: { element_id: input.selected_id, revision: input.base_revision } }
      : {}),
  });
  if (!parsed.success)
    return {
      status: 'rejected',
      code: 'INVALID_OPERATION',
      message: 'La proposition reçue est invalide. La carte est conservée.',
    };
  return {
    status: 'proposed',
    command: parsed.data,
    message: 'Une modification est prête à être relue.',
  };
}
