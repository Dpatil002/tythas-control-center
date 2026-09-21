import { withHandler } from '@/lib/http/with-handler';
import { ok } from '@/lib/http/respond';
import { requireOrgContext } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { markAllNotificationsRead } from '@/lib/notifications/service';

export const POST = withHandler(async (req: Request) => {
  const ctx = await requireOrgContext(req);

  let accessibleWebsiteIds: string[] | null = null;
  if (ctx.role !== 'OWNER') {
    const accessRecords = await db.websiteAccess.findMany({
      where: { userId: ctx.userId },
      select: { websiteId: true },
    });
    accessibleWebsiteIds = accessRecords.map((a) => a.websiteId);
  }

  await markAllNotificationsRead(ctx.organizationId, accessibleWebsiteIds);

  return ok({
    success: true,
    message: 'All notifications marked as read.',
  });
});
