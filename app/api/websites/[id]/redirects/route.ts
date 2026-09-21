import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { normalizePath, analyzeRedirectGraph } from '@/lib/seo/redirects';
import { z } from 'zod';

const CreateRedirectSchema = z.object({
  fromPath: z.string().min(1, 'Source path is required'),
  toPath: z.string().min(1, 'Destination path is required'),
  type: z.enum(['R301', 'R302', 'R307', 'R308']).default('R301')
});

export const GET = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();

  const redirects = await prisma.redirect.findMany({
    where: {
      websiteId: params.id,
      ...(q
        ? {
            OR: [
              { fromPath: { contains: q } },
              { toPath: { contains: q } }
            ]
          }
        : {})
    },
    orderBy: { createdAt: 'desc' }
  });

  const graphAnalysis = analyzeRedirectGraph(redirects);

  return ok({
    redirects: redirects.map((r) => {
      const fromNorm = normalizePath(r.fromPath);
      const toNorm = normalizePath(r.toPath);
      const isLoop = !!graphAnalysis.affectedPathMap[fromNorm]?.inLoop;
      const isChain = !!graphAnalysis.affectedPathMap[fromNorm]?.inChain;

      return {
        ...r,
        isLoop,
        isChain
      };
    }),
    stats: {
      total: redirects.length,
      loopsCount: graphAnalysis.loops.length,
      chainsCount: graphAnalysis.chains.length
    }
  });
});

export const POST = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const body = await req.json();
  const input = CreateRedirectSchema.parse(body);

  const fromNorm = normalizePath(input.fromPath);
  const toNorm = normalizePath(input.toPath);

  if (fromNorm === toNorm) {
    return fail(400, 'SELF_REDIRECT_ERROR', 'A path cannot redirect to itself.');
  }

  // Check unique fromPath within website
  const existing = await prisma.redirect.findUnique({
    where: {
      websiteId_fromPath: {
        websiteId: params.id,
        fromPath: fromNorm
      }
    }
  });

  if (existing) {
    return fail(409, 'DUPLICATE_FROM_PATH', `A redirect from "${fromNorm}" already exists.`);
  }

  const created = await prisma.redirect.create({
    data: {
      websiteId: params.id,
      fromPath: fromNorm,
      toPath: toNorm,
      type: input.type
    }
  });

  // Re-run graph analysis to check if this caused a loop or chain
  const allRedirects = await prisma.redirect.findMany({ where: { websiteId: params.id } });
  const graph = analyzeRedirectGraph(allRedirects);

  const createdInLoop = graph.loops.some((l) => l.redirectIds.includes(created.id));
  const createdInChain = graph.chains.some((c) => c.redirectIds.includes(created.id));

  return ok({
    redirect: created,
    warning: createdInLoop
      ? 'This redirect creates an infinite redirect loop!'
      : createdInChain
      ? 'This redirect creates a multi-hop redirect chain.'
      : null
  });
});
