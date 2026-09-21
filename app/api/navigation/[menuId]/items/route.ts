import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { fail } from '@/lib/http/respond';
import { PATCH as itemsPatch } from '../../../websites/[id]/navigation/[menuId]/items/route';

export const PATCH = withHandler(async (req: Request, { params }: { params: { menuId: string } }) => {
  const ctx = await requireOrgContext(req);
  const menu = await prisma.navigationMenu.findUnique({ where: { id: params.menuId } });
  if (!menu) return fail(404, 'NOT_FOUND', 'Navigation menu not found');
  await requireWebsiteAccess(ctx, menu.websiteId);
  return itemsPatch(req, { params: { id: menu.websiteId, menuId: params.menuId } });
});
