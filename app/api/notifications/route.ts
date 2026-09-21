import { withHandler } from '@/lib/http/with-handler';
import { ok } from '@/lib/http/respond';
import { requireOrgContext } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { getNotificationCounts } from '@/lib/notifications/service';

export const GET = withHandler(async (req: Request) => {
  const ctx = await requireOrgContext(req);

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get('status') || 'all'; // 'all' | 'unread' | 'critical'
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
  const unreadOnly = url.searchParams.get('unread') === 'true';

  // Determine accessible website IDs for Managers
  let accessibleWebsiteIds: string[] | null = null;
  if (ctx.role !== 'OWNER') {
    const accessRecords = await db.websiteAccess.findMany({
      where: { userId: ctx.userId },
      select: { websiteId: true },
    });
    accessibleWebsiteIds = accessRecords.map((a) => a.websiteId);
  }

  // Base scope filter (org-level + user's accessible websites)
  const whereScope: any = {
    organizationId: ctx.organizationId,
  };

  if (accessibleWebsiteIds !== null) {
    whereScope.OR = [
      { websiteId: { in: accessibleWebsiteIds } },
      { websiteId: null },
    ];
  }

  // Apply status filter
  const where: any = { ...whereScope };
  if (unreadOnly || statusFilter === 'unread') {
    where.readAt = null;
  } else if (statusFilter === 'critical') {
    where.severity = 'CRITICAL';
  }

  const [notifications, counts] = await Promise.all([
    db.notification.findMany({
      where,
      include: {
        website: {
          select: { id: true, name: true, domain: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    getNotificationCounts(ctx.organizationId, accessibleWebsiteIds),
  ]);

  return ok({
    notifications,
    counts,
  });
});
