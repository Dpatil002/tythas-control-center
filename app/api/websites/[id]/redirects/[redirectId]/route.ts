import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { NotFoundError } from '@/lib/http/errors';
import { normalizePath, analyzeRedirectGraph } from '@/lib/seo/redirects';
import { z } from 'zod';

const UpdateRedirectSchema = z.object({
  fromPath: z.string().optional(),
  toPath: z.string().optional(),
  type: z.enum(['R301', 'R302', 'R307', 'R308']).optional()
});

export const PATCH = withHandler(
  async (req: Request, { params }: { params: { id: string; redirectId: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const existing = await prisma.redirect.findFirst({
      where: { id: params.redirectId, websiteId: params.id }
    });

    if (!existing) {
      throw new NotFoundError('Redirect not found');
    }

    const body = await req.json();
    const input = UpdateRedirectSchema.parse(body);

    const newFrom = input.fromPath ? normalizePath(input.fromPath) : existing.fromPath;
    const newTo = input.toPath ? normalizePath(input.toPath) : existing.toPath;

    if (newFrom === newTo) {
      return fail(400, 'SELF_REDIRECT_ERROR', 'A path cannot redirect to itself.');
    }

    if (newFrom !== existing.fromPath) {
      const conflict = await prisma.redirect.findUnique({
        where: {
          websiteId_fromPath: {
            websiteId: params.id,
            fromPath: newFrom
          }
        }
      });
      if (conflict && conflict.id !== existing.id) {
        return fail(409, 'DUPLICATE_FROM_PATH', `A redirect from "${newFrom}" already exists.`);
      }
    }

    const updated = await prisma.redirect.update({
      where: { id: params.redirectId },
      data: {
        fromPath: newFrom,
        toPath: newTo,
        ...(input.type ? { type: input.type } : {})
      }
    });

    const allRedirects = await prisma.redirect.findMany({ where: { websiteId: params.id } });
    const graph = analyzeRedirectGraph(allRedirects);

    const inLoop = graph.loops.some((l) => l.redirectIds.includes(updated.id));
    const inChain = graph.chains.some((c) => c.redirectIds.includes(updated.id));

    return ok({
      redirect: updated,
      warning: inLoop
        ? 'This redirect creates an infinite redirect loop!'
        : inChain
        ? 'This redirect creates a multi-hop redirect chain.'
        : null
    });
  }
);

export const DELETE = withHandler(
  async (req: Request, { params }: { params: { id: string; redirectId: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const existing = await prisma.redirect.findFirst({
      where: { id: params.redirectId, websiteId: params.id }
    });

    if (!existing) {
      throw new NotFoundError('Redirect not found');
    }

    await prisma.redirect.delete({
      where: { id: params.redirectId }
    });

    return ok({ success: true });
  }
);
