import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { AccessDenied, demoSession, type ModelService } from '../application/model/service.ts';
import type { Session } from '../contracts/model.ts';
import { proposeChanges } from '../application/interviews/propose.ts';
import { demoProvider } from '../adapters/ai/demo-provider.ts';
import { z } from 'zod';
import { SourceError, type SourceService } from '../application/sources/service.ts';
import { SharingError, type SharingService } from '../application/sharing/service.ts';
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
    selected_id: z.string().max(120).optional(),
  })
  .strict();
const dossierSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    activity: z.string().trim().min(1).max(500).nullable(),
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
  capabilities: { sources?: SourceService; sharing?: SharingService } = {},
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
      if (req.method === 'POST' && path === '/api/proposals') {
        const parsed = proposalSchema.safeParse(await body(req));
        if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
        json(res, 200, await proposeChanges(service, session, parsed.data, demoProvider));
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
        (error instanceof SharingError && error.code === 'ACCESS_DENIED')
          ? 403
          : error instanceof SharingError &&
              ['IDEMPOTENCY_CONFLICT', 'PREVIEW_INVALID', 'VERSION_CONFLICT'].includes(error.code)
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
            : error instanceof SourceError || error instanceof SharingError
              ? error.code
              : error instanceof HttpError
                ? error.code
                : 'INTERNAL_ERROR',
        message:
          status === 403
            ? 'Dossier indisponible pour cet accès.'
            : error instanceof SourceError || error instanceof SharingError
              ? error.message
              : 'La demande a échoué. Vos modifications déjà enregistrées sont conservées.',
      });
    }
  });
}
