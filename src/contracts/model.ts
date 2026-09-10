export type Session = {
  user_id: string;
  application_role?: 'consultant' | 'responsable';
  grants: { dossier_id: string; model_id: string; write: boolean }[];
};
export type DossierSpace = 'private' | 'shared';
export type Dossier = {
  id: string;
  name: string;
  activity: string | null;
  state: 'active';
  available_spaces: DossierSpace[];
};
export type Task = {
  id: string;
  label: string;
  position: { x: number; y: number };
  knowledge: 'proposed';
  role: string | null;
};
export type Link = { id: string; source: string; target: string; type: 'sequence' };
export type Model = {
  id: string;
  dossier_id: string;
  name: string;
  revision: number;
  visibility: 'private';
  tasks: Task[];
  links: Link[];
};
export type CommandResult = {
  status: 'applied' | 'duplicate' | 'needs_clarification' | 'rejected' | 'conflict';
  revision?: number;
  applied_command_id?: string;
  changes?: string[];
  warnings: string[];
  correlation_id: string;
  code?: string;
  message?: string;
};
import { z } from 'zod';

const id = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const operationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('UNDO'), target_command_id: id }).strict(),
  z
    .object({
      type: z.literal('UPDATE_LABEL'),
      element_id: id,
      label: z.string().trim().min(1).max(160),
    })
    .strict(),
  z
    .object({
      type: z.literal('MOVE_ELEMENT'),
      element_id: id,
      position: z
        .object({ x: z.number().min(-10000).max(10000), y: z.number().min(-10000).max(10000) })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('ADD_TASK'),
      task_id: id,
      label: z.string().trim().min(1).max(160),
      before_id: id.optional(),
    })
    .strict(),
]);
export const commandSchema = z
  .object({
    schema_version: z.literal('1'),
    command_id: id,
    dossier_id: id,
    model_id: id,
    base_revision: z.number().int().nonnegative(),
    origin: z.enum(['manual', 'conversation']),
    operations: z.array(operationSchema).min(1).max(50),
    turn_id: id.optional(),
    statement: z.string().max(2000).optional(),
    selection_snapshot: z
      .object({ element_id: id, revision: z.number().int().nonnegative() })
      .strict()
      .optional(),
  })
  .strict();
export type Command = z.infer<typeof commandSchema>;
export type HistoryEntry = {
  revision: number;
  command_id: string;
  actor: string;
  origin: string;
  statement?: string;
  created_at: string;
  operations: Command['operations'];
};
