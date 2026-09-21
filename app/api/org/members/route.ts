import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { ok } from '@/lib/http/respond';

export const GET = withHandler(async (req) => {
  const ctx = await requireOrgContext(req);

  const members = await db.organizationMember.findMany({
    where: { organizationId: ctx.organizationId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          createdAt: true,
          lastLoginAt: true,
          mfaEnabled: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const formattedMembers = members.map((m) => ({
    id: m.id,
    userId: m.user.id,
    email: m.user.email,
    role: m.role,
    status: m.status,
    mfaEnabled: m.user.mfaEnabled,
    joinedAt: m.createdAt,
    lastLoginAt: m.user.lastLoginAt,
  }));

  return ok({ members: formattedMembers });
});
