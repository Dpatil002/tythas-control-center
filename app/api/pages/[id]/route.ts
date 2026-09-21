import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { fail } from '@/lib/http/respond';
import { GET as pageGet, PATCH as pagePatch, DELETE as pageDelete } from '../../websites/[id]/pages/[pageId]/route';

async function getPageWebsiteId(pageId: string) {
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  return page?.websiteId;
}

export const GET = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  const websiteId = await getPageWebsiteId(params.id);
  if (!websiteId) return fail(404, 'NOT_FOUND', 'Page not found');
  await requireWebsiteAccess(ctx, websiteId);
  return pageGet(req, { params: { id: websiteId, pageId: params.id } });
});

export const PATCH = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  const websiteId = await getPageWebsiteId(params.id);
  if (!websiteId) return fail(404, 'NOT_FOUND', 'Page not found');
  await requireWebsiteAccess(ctx, websiteId);
  return pagePatch(req, { params: { id: websiteId, pageId: params.id } });
});

export const DELETE = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  const websiteId = await getPageWebsiteId(params.id);
  if (!websiteId) return fail(404, 'NOT_FOUND', 'Page not found');
  await requireWebsiteAccess(ctx, websiteId);
  return pageDelete(req, { params: { id: websiteId, pageId: params.id } });
});
