import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { resolveTargetWebsiteId } from '@/lib/auth/resolve-website';
import { prisma } from '@/lib/db/prisma';

export const GET = withHandler(async (req: Request, { params }: { params: { menuId: string } }) => {
  const ctx = await requireOrgContext(req);
  const websiteId = await resolveTargetWebsiteId(req, ctx);
  await requireWebsiteAccess(ctx, websiteId);

  const paramLower = params.menuId.toLowerCase();
  const isLocation = ['primary', 'footer', 'mobile', 'header'].includes(paramLower);

  const loc = paramLower === 'header' ? 'primary' : paramLower;

  let menu = await prisma.navigationMenu.findFirst({
    where: {
      websiteId,
      ...(isLocation ? { location: loc } : { id: params.menuId }),
    },
    include: {
      items: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!menu && isLocation) {
    menu = await prisma.navigationMenu.create({
      data: {
        websiteId,
        name: `${loc.charAt(0).toUpperCase() + loc.slice(1)} Navigation`,
        location: loc,
        items: {
          create: [
            { label: 'Home', url: '/', order: 0, target: '_self' },
            { label: 'About', url: '/about', order: 1, target: '_self' },
            { label: 'Contact', url: '/contact', order: 2, target: '_self' },
          ],
        },
      },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  if (!menu) {
    return fail(404, 'NOT_FOUND', 'Navigation menu not found');
  }

  const items = menu.items || [];
  const rootItems = items.filter((i) => !i.parentId);
  const tree = rootItems.map((root) => ({
    ...root,
    children: items.filter((i) => i.parentId === root.id).sort((a, b) => a.order - b.order),
  }));

  return ok({
    menu: {
      ...menu,
      tree,
    },
  });
});
