import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireRole, requireWebsiteAccess } from '@/lib/auth/context';
import { grantAccessSchema } from '@/lib/validation/website.schema';
import { db } from '@/lib/db/prisma';
import { created } from '@/lib/http/respond';
import { NotFoundError, ValidationError } from '@/lib/http/errors';

export const POST = withHandler(async (req, context) => {
  const ctx = await requireOrgContext(req);
  requireRole(ctx, 'OWNER');

  const websiteId = context?.params?.id as string;
  await requireWebsiteAccess(ctx, websiteId);

  const body = await req.json();
  const input = grantAccessSchema.parse(body);

  // Validate that user is a member of this organization
  const member = await db.organizationMember.findFirst({
    where: {
      userId: input.userId,
      organizationId: ctx.organizationId,
    },
  });

  if (!member) {
    throw new NotFoundError('Team member not found in this organization.');
  }

  if (member.role === 'OWNER') {
    throw new ValidationError('Owners implicitly have access to all websites.');
  }

  const access = await db.websiteAccess.upsert({
    where: {
      websiteId_userId: {
        websiteId,
        userId: input.userId,
      },
    },
    create: {
      websiteId,
      userId: input.userId,
    },
    update: {},
  });

  return created({ access, message: 'Access granted to teammate.' });
});
