import { z } from 'zod';

const identifier = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9_:-]+$/);

export const createSharePreviewSchema = z
  .object({
    source_id: identifier,
    source_version: z.number().int().positive(),
    passage_id: identifier,
    shared_text: z.string().trim().min(1).max(2000),
  })
  .strict();

export const publishShareSchema = z
  .object({ preview_id: identifier, idempotency_key: identifier })
  .strict();

export const revokeShareSchema = z.object({ base_version: z.number().int().positive() }).strict();

export type CreateSharePreviewInput = z.infer<typeof createSharePreviewSchema>;
export type PublishShareInput = z.infer<typeof publishShareSchema>;
