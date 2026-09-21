import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { fail } from '@/lib/http/respond';
import { GET as previewGet } from '../../../websites/[id]/pages/[pageId]/preview/route';

export const GET = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  const page = await prisma.page.findUnique({ where: { id: params.id } });
  if (!page) return fail(404, 'NOT_FOUND', 'Page not found');
  await requireWebsiteAccess(ctx, page.websiteId);
  return previewGet(req, { params: { id: page.websiteId, pageId: params.id } });
});
