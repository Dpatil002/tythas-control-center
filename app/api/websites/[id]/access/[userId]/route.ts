import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireRole, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { ok } from '@/lib/http/respond';
import { NotFoundError } from '@/lib/http/errors';

export const DELETE = withHandler(async (req, context) => {
  const ctx = await requireOrgContext(req);
  requireRole(ctx, 'OWNER');

  const websiteId = context?.params?.id as string;
  const targetUserId = context?.params?.userId as string;

  await requireWebsiteAccess(ctx, websiteId);

  const existing = await db.websiteAccess.findUnique({
    where: {
      websiteId_userId: {
        websiteId,
        userId: targetUserId,
      },
    },
  });

  if (!existing) {
    throw new NotFoundError('Website access record not found.');
  }

  await db.websiteAccess.delete({
    where: {
      websiteId_userId: {
        websiteId,
        userId: targetUserId,
      },
    },
  });

  return ok({ message: 'Website access revoked.' });
});
