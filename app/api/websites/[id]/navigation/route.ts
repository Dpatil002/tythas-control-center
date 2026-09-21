import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';

export const GET = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  // Ensure default menus exist (primary and footer)
  let menus = await prisma.navigationMenu.findMany({
    where: { websiteId: params.id },
    include: {
      items: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (menus.length === 0) {
    const primary = await prisma.navigationMenu.create({
      data: {
        websiteId: params.id,
        name: 'Main Header Navigation',
        location: 'primary',
        items: {
          create: [
            { label: 'Home', url: '/', order: 0, target: '_self' },
            { label: 'About', url: '/about', order: 1, target: '_self' },
            { label: 'Services', url: '/services', order: 2, target: '_self' },
            { label: 'Blog', url: '/blog', order: 3, target: '_self' },
            { label: 'Contact', url: '/contact', order: 4, target: '_self' },
          ],
        },
      },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
      },
    });

    const footer = await prisma.navigationMenu.create({
      data: {
        websiteId: params.id,
        name: 'Footer Navigation',
        location: 'footer',
        items: {
          create: [
            { label: 'Privacy Policy', url: '/privacy', order: 0, target: '_self' },
            { label: 'Terms of Service', url: '/terms', order: 1, target: '_self' },
            { label: 'Contact Support', url: '/contact', order: 2, target: '_self' },
          ],
        },
      },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
      },
    });

    menus = [primary, footer];
  }

  // Format menus with tree structure for nested children
  const formatted = menus.map((menu) => {
    const items = menu.items || [];
    const rootItems = items.filter((i) => !i.parentId);
    const tree = rootItems.map((root) => ({
      ...root,
      children: items.filter((i) => i.parentId === root.id).sort((a, b) => a.order - b.order),
    }));

    return {
      ...menu,
      items,
      tree,
    };
  });

  return ok({ menus: formatted });
});
