import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { fail } from '@/lib/http/respond';
import { POST as publishPost } from '../../../websites/[id]/pages/[pageId]/publish/route';

export const POST = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  const page = await prisma.page.findUnique({ where: { id: params.id } });
  if (!page) return fail(404, 'NOT_FOUND', 'Page not found');
  await requireWebsiteAccess(ctx, page.websiteId);
  return publishPost(req, { params: { id: page.websiteId, pageId: params.id } });
});
