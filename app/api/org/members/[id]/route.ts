import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireRole } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { ok } from '@/lib/http/respond';
import { NotFoundError, ValidationError } from '@/lib/http/errors';

export const DELETE = withHandler(async (req, context) => {
  const ctx = await requireOrgContext(req);
  requireRole(ctx, 'OWNER');

  const memberId = context?.params?.id as string;

  const member = await db.organizationMember.findFirst({
    where: {
      id: memberId,
      organizationId: ctx.organizationId,
    },
  });

  if (!member) {
    throw new NotFoundError('Member not found.');
  }

  if (member.userId === ctx.userId) {
    throw new ValidationError('You cannot remove yourself from the organization.');
  }

  // Delete OrganizationMember and any associated WebsiteAccess for this org
  await db.$transaction(async (tx) => {
    // Delete website access grants for websites in this org
    const orgWebsites = await tx.website.findMany({
      where: { organizationId: ctx.organizationId },
      select: { id: true },
    });
    const websiteIds = orgWebsites.map((w) => w.id);

    await tx.websiteAccess.deleteMany({
      where: {
        userId: member.userId,
        websiteId: { in: websiteIds },
      },
    });

    await tx.organizationMember.delete({
      where: { id: member.id },
    });
  });

  return ok({ message: 'Team member has been removed.' });
});
