import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { ok } from '@/lib/http/respond';
import { cookies } from 'next/headers';

const CURRENT_WEBSITE_COOKIE = 'tythas_active_website';

export const GET = withHandler(async (req) => {
  const ctx = await requireOrgContext(req);

  // Read active website cookie
  const cookieStore = cookies();
  const requestedWebsiteId = cookieStore.get(CURRENT_WEBSITE_COOKIE)?.value;

  // Get all verified websites accessible to this user
  let accessibleWebsites;

  if (ctx.role === 'OWNER') {
    accessibleWebsites = await db.website.findMany({
      where: {
        organizationId: ctx.organizationId,
        ownershipVerifiedAt: { not: null },
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  } else {
    const access = await db.websiteAccess.findMany({
      where: { userId: ctx.userId },
      select: { websiteId: true },
    });
    const ids = access.map((a) => a.websiteId);

    accessibleWebsites = await db.website.findMany({
      where: {
        id: { in: ids },
        organizationId: ctx.organizationId,
        ownershipVerifiedAt: { not: null },
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  if (accessibleWebsites.length === 0) {
    return ok({ currentWebsite: null, accessibleWebsites: [] });
  }

  let activeWebsite = requestedWebsiteId
    ? accessibleWebsites.find((w) => w.id === requestedWebsiteId)
    : null;

  if (!activeWebsite) {
    activeWebsite = accessibleWebsites[0];
  }

  return ok({
    currentWebsite: activeWebsite,
    accessibleWebsites,
  });
});
