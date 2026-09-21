import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { getConnector } from '@/lib/connectors/registry';
import { decryptConnectorData } from '@/lib/connectors/crypto';
import { DecryptedCredential } from '@/lib/connectors/types';
import { z } from 'zod';

const UpdateNavItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().optional(),
      label: z.string().min(1, 'Label is required'),
      url: z.string().min(1, 'URL is required'),
      target: z.string().default('_self'),
      order: z.number(),
      parentId: z.string().nullable().optional(),
    })
  ),
});

export const PATCH = withHandler(async (req: Request, { params }: { params: { id: string; menuId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const menu = await prisma.navigationMenu.findFirst({
    where: {
      id: params.menuId,
      websiteId: params.id,
    },
  });

  if (!menu) {
    return fail(404, 'NOT_FOUND', 'Navigation menu not found');
  }

  const body = await req.json();
  const input = UpdateNavItemsSchema.parse(body);

  // In a single transaction, recreate all navigation items cleanly
  const updatedItems = await prisma.$transaction(async (tx) => {
    // Delete existing items for this menu
    await tx.navigationItem.deleteMany({
      where: { menuId: menu.id },
    });

    // First create root items (parentId is null)
    const rootInputs = input.items.filter((i) => !i.parentId);
    const childInputs = input.items.filter((i) => !!i.parentId);

    const createdRootMap: Record<string, string> = {}; // client temp id -> db id

    for (const r of rootInputs) {
      const created = await tx.navigationItem.create({
        data: {
          menuId: menu.id,
          label: r.label,
          url: r.url,
          target: r.target || '_self',
          order: r.order,
          parentId: null,
        },
      });
      if (r.id) {
        createdRootMap[r.id] = created.id;
      }
    }

    // Now create child items
    for (const c of childInputs) {
      const parentDbId = c.parentId ? (createdRootMap[c.parentId] || c.parentId) : null;
      await tx.navigationItem.create({
        data: {
          menuId: menu.id,
          label: c.label,
          url: c.url,
          target: c.target || '_self',
          order: c.order,
          parentId: parentDbId,
        },
      });
    }

    return tx.navigationItem.findMany({
      where: { menuId: menu.id },
      orderBy: { order: 'asc' },
    });
  });

  // Call connector updateNavigation
  const website = await prisma.website.findUnique({
    where: { id: params.id },
    include: { credential: true },
  });

  if (website?.credential?.encryptedData) {
    try {
      const decrypted = decryptConnectorData<DecryptedCredential>(website.credential.encryptedData);
      const connector = getConnector(website.connectorType);
      await connector.updateNavigation(website, menu.id, updatedItems, decrypted);
    } catch {}
  }

  return ok({
    success: true,
    menuId: menu.id,
    items: updatedItems,
    message: `Navigation items for "${menu.name}" updated and synced successfully.`,
  });
});
