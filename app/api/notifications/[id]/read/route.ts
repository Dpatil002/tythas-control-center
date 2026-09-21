import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';

export const PATCH = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);

  const notification = await db.notification.findFirst({
    where: {
      id: params.id,
      organizationId: ctx.organizationId,
    },
  });

  if (!notification) {
    return fail(404, 'NOT_FOUND', 'Notification not found.');
  }

  // If user is manager and notification is website-scoped, check access
  if (ctx.role !== 'OWNER' && notification.websiteId) {
    const access = await db.websiteAccess.findUnique({
      where: {
        websiteId_userId: {
          websiteId: notification.websiteId,
          userId: ctx.userId,
        },
      },
    });
    if (!access) {
      return fail(404, 'NOT_FOUND', 'Notification not found.');
    }
  }

  const updated = await db.notification.update({
    where: { id: notification.id },
    data: { readAt: new Date() },
  });

  return ok({
    notification: updated,
  });
});
