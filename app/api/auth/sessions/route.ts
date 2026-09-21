import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { ok } from '@/lib/http/respond';

export const GET = withHandler(async (req) => {
  const ctx = await requireOrgContext(req);

  const sessions = await db.session.findMany({
    where: {
      userId: ctx.userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastSeenAt: 'desc' },
    select: {
      id: true,
      ip: true,
      userAgent: true,
      createdAt: true,
      lastSeenAt: true,
      expiresAt: true,
    },
  });

  const formattedSessions = sessions.map((s) => ({
    ...s,
    isCurrent: s.id === ctx.sessionId,
  }));

  return ok({ sessions: formattedSessions });
});
