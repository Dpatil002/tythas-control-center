import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireRole } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { ok } from '@/lib/http/respond';
import { NotFoundError } from '@/lib/http/errors';

export const DELETE = withHandler(async (req, context) => {
  const ctx = await requireOrgContext(req);
  requireRole(ctx, 'OWNER');

  const invitationId = context?.params?.id as string;

  const invitation = await db.invitation.findFirst({
    where: {
      id: invitationId,
      organizationId: ctx.organizationId,
    },
  });

  if (!invitation) {
    throw new NotFoundError('Invitation not found.');
  }

  await db.invitation.update({
    where: { id: invitation.id },
    data: { revokedAt: new Date() },
  });

  return ok({ message: 'Invitation has been revoked.' });
});
