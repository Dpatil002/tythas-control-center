import { withHandler } from '@/lib/http/with-handler';
import { ok } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { analyzeRedirectGraph } from '@/lib/seo/redirects';

export const GET = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const redirects = await prisma.redirect.findMany({
    where: { websiteId: params.id }
  });

  const analysis = analyzeRedirectGraph(redirects);

  return ok({
    loops: analysis.loops,
    chains: analysis.chains,
    totalIssues: analysis.totalIssues,
    affectedPathMap: analysis.affectedPathMap
  });
});
