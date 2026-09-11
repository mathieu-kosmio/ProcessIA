import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { AccessDenied, demoSession, type ModelService } from '../application/model/service.ts';
import type { Session } from '../contracts/model.ts';
import { proposeChanges } from '../application/interviews/propose.ts';
import { demoProvider } from '../adapters/ai/demo-provider.ts';
import { z } from 'zod';
import { SourceError, type SourceService } from '../application/sources/service.ts';
import { SharingError, type SharingService } from '../application/sharing/service.ts';
import { EnrichmentError, type EnrichmentService } from '../application/interviews/enrichment.ts';
import { InterviewError, type InterviewService } from '../application/interviews/session.ts';
import type { BpmnService } from '../adapters/bpmn/service.ts';
import {
  createSharePreviewSchema,
  publishShareSchema,
  revokeShareSchema,
} from '../contracts/sharing.ts';

const proposalSchema = z
  .object({
    dossier_id: z.string().min(1).max(120),
    model_id: z.string().min(1).max(120),
    base_revision: z.number().int().nonnegative(),
    text: z.string().trim().min(1).max(2000),
    view: z.enum(['map', 'list']).optional(),
    selected_id: z.string().max(120).optional(),
  })
  .strict();
const dossierSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    activity: z.string().trim().min(1).max(500).nullable(),
  })
  .strict();
const roleEnrichmentSchema = z
  .object({
    task_id: z.string().min(1).max(120),
    source_id: z.string().min(1).max(120),
    source_version: z.number().int().positive(),
    passage_id: z.string().min(1).max(120),
    proposed_role: z
      .object({
        role_id: z.string().min(1).max(120),
        label: z.string().trim().min(1).max(160),
      })
      .strict(),
  })
  .strict();
const rejectEnrichmentSchema = z
  .object({ reason: z.string().trim().max(1000).optional() })
  .strict();
const startInterviewSchema = z
  .object({
    dossier_id: z.string().min(1).max(120),
    model_id: z.string().min(1).max(120),
    transcription_policy: z.enum(['session', 'dossier', 'none']),
  })
  .strict();
const interviewConsentSchema = z.object({ granted: z.boolean() }).strict();
const interviewModeSchema = z.object({ mode: z.enum(['voice', 'text']) }).strict();
const interviewTurnSchema = z
  .object({
    idempotency_key: z.string().min(1).max(120),
    mode: z.enum(['voice', 'text']),
    text: z.string().trim().min(1).max(2000),
    selection_snapshot: z
      .object({
        element_id: z.string().min(1).max(120),
        revision: z.number().int().nonnegative(),
      })
      .strict()
      .optional(),
  })
  .strict();
const interviewResponseSchema = z.object({ text: z.string().trim().min(1).max(2000) }).strict();
const transcriptCorrectionSchema = z.object({ text: z.string().trim().min(1).max(2000) }).strict();
const bpmnNodeSchema = z
  .object({
    id: z.string().min(1).max(120),
    type: z.enum([
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
    ]),
    label: z.string().trim().min(1).max(240),
    process_id: z.string().min(1).max(120),
    participant_id: z.string().min(1).max(120),
    lane_id: z.string().min(1).max(120).optional(),
    parent_subprocess_id: z.string().min(1).max(120).nullable(),
    position: z.object({ x: z.number().finite(), y: z.number().finite() }).strict(),
    collapsed: z.boolean().optional(),
    execution: z.literal('disabled').optional(),
  })
  .strict();
const bpmnFlowSchema = z
  .object({
    id: z.string().min(1).max(120),
    type: z.enum(['sequenceFlow', 'messageFlow', 'association']),
    source_id: z.string().min(1).max(120),
    target_id: z.string().min(1).max(120),
    condition: z.string().trim().max(500).optional(),
  })
  .strict();
const bpmnCommandSchema = z
  .object({
    command_id: z.string().min(1).max(120),
    base_revision: z.number().int().nonnegative(),
    operations: z
      .array(
        z.discriminatedUnion('type', [
          z.object({ type: z.literal('ADD_NODE'), node: bpmnNodeSchema }).strict(),
          z.object({ type: z.literal('ADD_FLOW'), flow: bpmnFlowSchema }).strict(),
          z
            .object({
              type: z.literal('TOGGLE_SUBPROCESS'),
              subprocess_id: z.string().min(1).max(120),
              collapsed: z.boolean(),
            })
            .strict(),
          z
            .object({
              type: z.literal('SET_VIEW'),
              open_process_id: z.string().min(1).max(120),
              breadcrumb_ids: z.array(z.string().min(1).max(120)).min(1).max(20),
              selected_id: z.string().min(1).max(120).optional(),
              zoom: z.number().min(0.25).max(4),
            })
            .strict(),
        ]),
      )
      .min(1)
      .max(50),
  })
  .strict();
class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
async function body(req: IncomingMessage) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json')
    throw new HttpError(415, 'JSON_REQUIRED');
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 32768) throw new HttpError(413, 'BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'INVALID_JSON');
  }
}
function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

export function createAppServer(
  service: ModelService,
  fallback?: (req: IncomingMessage, res: ServerResponse) => void,
  session: Session = demoSession,
  capabilities: {
    sources?: SourceService;
    sharing?: SharingService;
    enrichments?: EnrichmentService;
    interviews?: InterviewService;
    bpmn?: BpmnService;
  } = {},
) {
  return createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    try {
      const host = req.headers.host ?? '';
      if (!/^127\.0\.0\.1:\d+$/.test(host)) throw new HttpError(403, 'ACCESS_DENIED');
      const path = new URL(req.url ?? '/', `http://${host}`).pathname;
      if (!path.startsWith('/api/')) {
        if (fallback) {
          fallback(req, res);
          return;
        }
        json(res, 404, { code: 'NOT_FOUND' });
        return;
      }
      if (req.headers['sec-fetch-site'] === 'cross-site') throw new HttpError(403, 'ACCESS_DENIED');
      if (req.method === 'POST' && req.headers.origin !== `http://${host}`)
        throw new HttpError(403, 'ACCESS_DENIED');
      if (req.method === 'GET' && path === '/api/health') {
        json(res, 200, { status: 'ok', mode: 'synthetic-local' });
        return;
      }
      if (req.method === 'GET' && path === '/api/dossiers') {
        json(res, 200, service.listDossiers(session));
        return;
      }
      if (req.method === 'POST' && path === '/api/dossiers') {
        const parsed = dossierSchema.safeParse(await body(req));
        if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
        json(res, 201, service.createDossier(session, parsed.data));
        return;
      }
      const dossierMatch = /^\/api\/dossiers\/([\w-]+)$/.exec(path);
      if (req.method === 'GET' && dossierMatch) {
        json(res, 200, service.getDossier(session, dossierMatch[1]));
        return;
      }
      const match = /^\/api\/dossiers\/([\w-]+)\/models\/([\w-]+)(\/history)?$/.exec(path);
      if (req.method === 'GET' && match) {
        json(
          res,
          200,
          match[3]
            ? service.getHistory(session, match[1], match[2])
            : service.getModel(session, match[1], match[2]),
        );
        return;
      }
      if (req.method === 'POST' && path === '/api/commands') {
        const result = service.execute(session, await body(req));
        json(
          res,
          result.code === 'ACCESS_DENIED'
            ? 403
            : result.status === 'conflict'
              ? 409
              : result.status === 'rejected'
                ? 422
                : 200,
          result,
        );
        return;
      }
      const bpmnMatch =
        /^\/api\/dossiers\/([\w-]+)\/models\/([\w-]+)\/bpmn(\/validation|\/commands)?$/.exec(path);
      if (req.method === 'GET' && bpmnMatch && capabilities.bpmn) {
        json(
          res,
          200,
          bpmnMatch[3] === '/validation'
            ? capabilities.bpmn.validate(session, bpmnMatch[1], bpmnMatch[2])
            : capabilities.bpmn.get(session, bpmnMatch[1], bpmnMatch[2]),
        );
        return;
      }
      if (req.method === 'POST' && bpmnMatch?.[3] === '/commands' && capabilities.bpmn) {
        const parsed = bpmnCommandSchema.safeParse(await body(req));
        if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
        const result = capabilities.bpmn.execute(session, bpmnMatch[1], bpmnMatch[2], parsed.data);
        json(
          res,
          result.status === 'conflict' ? 409 : result.status === 'rejected' ? 422 : 200,
          result,
        );
        return;
      }
      if (req.method === 'POST' && path === '/api/proposals') {
        const parsed = proposalSchema.safeParse(await body(req));
        if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
        json(res, 200, await proposeChanges(service, session, parsed.data, demoProvider));
        return;
      }
      if (req.method === 'POST' && path === '/api/interviews' && capabilities.interviews) {
        const parsed = startInterviewSchema.safeParse(await body(req));
        if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
        json(res, 201, capabilities.interviews.start(session, parsed.data));
        return;
      }
      const interviewMatch = /^\/api\/interviews\/([\w-]+)$/.exec(path);
      if (req.method === 'GET' && interviewMatch && capabilities.interviews) {
        json(res, 200, capabilities.interviews.get(session, interviewMatch[1]));
        return;
      }
      const interviewActionMatch =
        /^\/api\/interviews\/([\w-]+)\/(consent|mode|listen|pause|interrupt|turns|responses)$/.exec(
          path,
        );
      if (req.method === 'POST' && interviewActionMatch && capabilities.interviews) {
        const interviewId = interviewActionMatch[1];
        const action = interviewActionMatch[2];
        if (action === 'consent') {
          const parsed = interviewConsentSchema.safeParse(await body(req));
          if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
          json(
            res,
            200,
            capabilities.interviews.setVoiceConsent(session, interviewId, parsed.data.granted),
          );
          return;
        }
        if (action === 'mode') {
          const parsed = interviewModeSchema.safeParse(await body(req));
          if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
          json(
            res,
            200,
            capabilities.interviews.switchMode(session, interviewId, parsed.data.mode),
          );
          return;
        }
        if (action === 'turns') {
          const parsed = interviewTurnSchema.safeParse(await body(req));
          if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
          json(res, 201, capabilities.interviews.addTurn(session, interviewId, parsed.data));
          return;
        }
        if (action === 'responses') {
          const parsed = interviewResponseSchema.safeParse(await body(req));
          if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
          json(
            res,
            201,
            capabilities.interviews.beginResponse(session, interviewId, parsed.data.text),
          );
          return;
        }
        const result =
          action === 'listen'
            ? capabilities.interviews.listen(session, interviewId)
            : action === 'pause'
              ? capabilities.interviews.pause(session, interviewId)
              : capabilities.interviews.interrupt(session, interviewId);
        json(res, 200, result);
        return;
      }
      const correctionMatch = /^\/api\/interviews\/([\w-]+)\/messages\/([\w-]+)\/correct$/.exec(
        path,
      );
      if (req.method === 'POST' && correctionMatch && capabilities.interviews) {
        const parsed = transcriptCorrectionSchema.safeParse(await body(req));
        if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
        json(
          res,
          200,
          capabilities.interviews.correctTranscript(
            session,
            correctionMatch[1],
            correctionMatch[2],
            parsed.data.text,
          ),
        );
        return;
      }
      const enrichmentsMatch = /^\/api\/dossiers\/([\w-]+)\/models\/([\w-]+)\/enrichments$/.exec(
        path,
      );
      if (req.method === 'GET' && enrichmentsMatch && capabilities.enrichments) {
        json(
          res,
          200,
          capabilities.enrichments.list(session, enrichmentsMatch[1], enrichmentsMatch[2]),
        );
        return;
      }
      const roleEnrichmentMatch =
        /^\/api\/dossiers\/([\w-]+)\/models\/([\w-]+)\/enrichments\/role$/.exec(path);
      if (req.method === 'POST' && roleEnrichmentMatch && capabilities.enrichments) {
        const parsed = roleEnrichmentSchema.safeParse(await body(req));
        if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
        json(
          res,
          201,
          capabilities.enrichments.proposeRole(session, roleEnrichmentMatch[1], {
            model_id: roleEnrichmentMatch[2],
            ...parsed.data,
          }),
        );
        return;
      }
      const enrichmentActionMatch =
        /^\/api\/dossiers\/([\w-]+)\/models\/([\w-]+)\/enrichments\/([\w-]+)\/(accept|reject)$/.exec(
          path,
        );
      if (req.method === 'POST' && enrichmentActionMatch && capabilities.enrichments) {
        if (enrichmentActionMatch[4] === 'accept') {
          json(
            res,
            200,
            capabilities.enrichments.accept(
              session,
              enrichmentActionMatch[1],
              enrichmentActionMatch[2],
              enrichmentActionMatch[3],
            ),
          );
          return;
        }
        const parsed = rejectEnrichmentSchema.safeParse(await body(req));
        if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
        json(
          res,
          200,
          capabilities.enrichments.reject(
            session,
            enrichmentActionMatch[1],
            enrichmentActionMatch[2],
            enrichmentActionMatch[3],
            parsed.data.reason,
          ),
        );
        return;
      }
      const sourcesMatch = /^\/api\/dossiers\/([\w-]+)\/sources$/.exec(path);
      if (req.method === 'GET' && sourcesMatch && capabilities.sources) {
        json(res, 200, capabilities.sources.list(session, sourcesMatch[1]));
        return;
      }
      const sourceStatusMatch = /^\/api\/dossiers\/([\w-]+)\/sources\/([\w-]+)\/status$/.exec(path);
      if (req.method === 'GET' && sourceStatusMatch && capabilities.sources) {
        json(
          res,
          200,
          capabilities.sources.status(session, sourceStatusMatch[1], sourceStatusMatch[2]),
        );
        return;
      }
      const previewMatch = /^\/api\/dossiers\/([\w-]+)\/sharing\/previews$/.exec(path);
      if (req.method === 'POST' && previewMatch && capabilities.sharing) {
        const parsed = createSharePreviewSchema.safeParse(await body(req));
        if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
        json(res, 200, capabilities.sharing.preview(session, previewMatch[1], parsed.data));
        return;
      }
      const cancelPreviewMatch =
        /^\/api\/dossiers\/([\w-]+)\/sharing\/previews\/([\w-]+)\/cancel$/.exec(path);
      if (req.method === 'POST' && cancelPreviewMatch && capabilities.sharing) {
        json(
          res,
          200,
          capabilities.sharing.cancelPreview(session, cancelPreviewMatch[1], cancelPreviewMatch[2]),
        );
        return;
      }
      const publicationsMatch = /^\/api\/dossiers\/([\w-]+)\/sharing\/publications$/.exec(path);
      if (req.method === 'POST' && publicationsMatch && capabilities.sharing) {
        const parsed = publishShareSchema.safeParse(await body(req));
        if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
        json(res, 201, capabilities.sharing.publish(session, publicationsMatch[1], parsed.data));
        return;
      }
      const sharedListMatch = /^\/api\/dossiers\/([\w-]+)\/shared-knowledge$/.exec(path);
      if (req.method === 'GET' && sharedListMatch && capabilities.sharing) {
        json(res, 200, capabilities.sharing.list(session, sharedListMatch[1]));
        return;
      }
      const revokeMatch = /^\/api\/dossiers\/([\w-]+)\/shared-knowledge\/([\w-]+)\/revoke$/.exec(
        path,
      );
      if (req.method === 'POST' && revokeMatch && capabilities.sharing) {
        const parsed = revokeShareSchema.safeParse(await body(req));
        if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
        json(
          res,
          200,
          capabilities.sharing.revoke(
            session,
            revokeMatch[1],
            revokeMatch[2],
            parsed.data.base_version,
          ),
        );
        return;
      }
      json(res, 404, { code: 'NOT_FOUND' });
    } catch (error) {
      const status =
        error instanceof AccessDenied ||
        (error instanceof SourceError && error.code === 'ACCESS_DENIED') ||
        (error instanceof SharingError && error.code === 'ACCESS_DENIED') ||
        (error instanceof InterviewError && error.code === 'INTERVIEW_NOT_FOUND')
          ? 403
          : error instanceof EnrichmentError && error.code === 'MODEL_CONFLICT'
            ? 409
            : error instanceof InterviewError && error.code === 'IDEMPOTENCY_CONFLICT'
              ? 409
              : error instanceof InterviewError
                ? 400
                : error instanceof EnrichmentError
                  ? 400
                  : error instanceof SharingError &&
                      ['IDEMPOTENCY_CONFLICT', 'PREVIEW_INVALID', 'VERSION_CONFLICT'].includes(
                        error.code,
                      )
                    ? 409
                    : error instanceof SourceError
                      ? 400
                      : error instanceof HttpError
                        ? error.status
                        : 500;
      json(res, status, {
        code:
          error instanceof AccessDenied
            ? 'ACCESS_DENIED'
            : error instanceof SourceError ||
                error instanceof SharingError ||
                error instanceof EnrichmentError ||
                error instanceof InterviewError
              ? error.code
              : error instanceof HttpError
                ? error.code
                : 'INTERNAL_ERROR',
        message:
          status === 403
            ? 'Dossier indisponible pour cet accès.'
            : error instanceof SourceError ||
                error instanceof SharingError ||
                error instanceof EnrichmentError ||
                error instanceof InterviewError
              ? error.message
              : 'La demande a échoué. Vos modifications déjà enregistrées sont conservées.',
      });
    }
  });
}
