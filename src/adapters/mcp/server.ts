import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { SourceError, type SourceService } from '../../application/sources/service.ts';
import type { Session } from '../../contracts/model.ts';
import {
  addSourceSchema,
  dossierTargetSchema,
  sourceTargetSchema,
} from '../../contracts/source.ts';

const processingStatusSchema = z.enum(['received', 'processing', 'completed', 'partial', 'failed']);
const addSourceResultSchema = z.object({
  source_id: z.string(),
  version: z.number().int().positive(),
  job_id: z.string(),
  processing_status: processingStatusSchema,
  imported_at: z.string(),
});
const sourceSummarySchema = z.object({
  source_id: z.string(),
  title: z.string(),
  source_type: z.enum(['text', 'transcript']),
  visibility: z.literal('private'),
  source_date: z.string().nullable(),
  current_version: z.number().int().positive(),
  processing_status: processingStatusSchema,
});

export function createProcessIAMcpServer(service: SourceService, session: Session) {
  const server = new McpServer({ name: 'processia', version: '0.1.0' });

  server.registerTool(
    'processia_identity',
    {
      title: 'Contexte ProcessIA',
      description: "Retourne l'identité applicative et les droits effectifs de la session.",
      inputSchema: z.object({}).strict(),
      outputSchema: z.object({
        user_id: z.string(),
        application_role: z.enum(['consultant', 'responsable']).nullable(),
        dossiers: z.array(
          z.object({
            dossier_id: z.string(),
            scopes: z.array(z.enum(['private', 'shared'])),
            capabilities: z.array(z.enum(['read_sources', 'write_private_sources'])),
          }),
        ),
      }),
      annotations: { readOnlyHint: true },
    },
    () => success(service.identity(session)),
  );

  server.registerTool(
    'processia_add_source',
    {
      title: 'Ajouter une source privée',
      description:
        'Ajoute un texte ou une transcription dans le dossier explicitement ciblé. Le contenu est conservé comme donnée à analyser.',
      inputSchema: addSourceSchema,
      outputSchema: addSourceResultSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    (input) => guarded(() => service.add(session, input)),
  );

  server.registerTool(
    'processia_list_sources',
    {
      title: 'Lister les sources privées',
      description: 'Liste les sources privées visibles dans le dossier ciblé.',
      inputSchema: dossierTargetSchema,
      outputSchema: z.object({ items: z.array(sourceSummarySchema) }),
      annotations: { readOnlyHint: true },
    },
    ({ dossier_id }) => guarded(() => service.list(session, dossier_id)),
  );

  server.registerTool(
    'processia_get_source_status',
    {
      title: "Consulter l'état d'une source",
      description:
        "Retourne l'état et les passages du traitement pour une source privée autorisée.",
      inputSchema: sourceTargetSchema,
      outputSchema: addSourceResultSchema.extend({
        error: z.string().nullable(),
        coverage: z
          .object({ extracted_passages: z.number().int().nonnegative(), total_bytes: z.number() })
          .nullable(),
        passages: z.array(
          z.object({
            passage_id: z.string(),
            ordinal: z.number().int().positive(),
            text: z.string(),
            char_start: z.number().int().nonnegative(),
            char_end: z.number().int().nonnegative(),
          }),
        ),
      }),
      annotations: { readOnlyHint: true },
    },
    ({ dossier_id, source_id }) => guarded(() => service.status(session, dossier_id, source_id)),
  );

  return server;
}

function success(data: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data) }],
    structuredContent: data,
  };
}

function guarded(action: () => Record<string, unknown>) {
  try {
    return success(action());
  } catch (error) {
    const sourceError =
      error instanceof SourceError
        ? error
        : new SourceError('ACCESS_DENIED', 'Opération indisponible pour cet accès.');
    const safe = { code: sourceError.code, message: sourceError.message };
    return {
      isError: true,
      content: [{ type: 'text' as const, text: JSON.stringify(safe) }],
      structuredContent: safe,
    };
  }
}
