import { z } from 'zod';

const identifier = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9_-]+$/);

export const addSourceSchema = z
  .object({
    dossier_id: identifier,
    idempotency_key: identifier,
    title: z.string().trim().min(1).max(240),
    source_type: z.enum(['text', 'transcript']),
    origin_context: z.string().trim().min(1).max(1000),
    source_date: z.string().date().nullable(),
    content: z.string().min(1),
  })
  .strict();

export const dossierTargetSchema = z.object({ dossier_id: identifier }).strict();
export const sourceTargetSchema = z
  .object({ dossier_id: identifier, source_id: identifier })
  .strict();

export type AddSourceInput = z.infer<typeof addSourceSchema>;
export type ProcessingStatus = 'received' | 'processing' | 'completed' | 'partial' | 'failed';
export type AddSourceResult = {
  source_id: string;
  version: number;
  job_id: string;
  processing_status: ProcessingStatus;
  imported_at: string;
};
export type SourceSummary = {
  source_id: string;
  title: string;
  source_type: AddSourceInput['source_type'];
  visibility: 'private';
  source_date: string | null;
  current_version: number;
  processing_status: ProcessingStatus;
};
