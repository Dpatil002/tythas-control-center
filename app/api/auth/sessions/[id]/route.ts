import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext } from '@/lib/auth/context';
import { revokeSession } from '@/lib/auth/session';
import { ok } from '@/lib/http/respond';
import { NotFoundError } from '@/lib/http/errors';
import { db } from '@/lib/db/prisma';

export const DELETE = withHandler(async (req, context) => {
  const ctx = await requireOrgContext(req);
  const sessionId = context?.params?.id as string;

  if (!sessionId) {
    throw new NotFoundError('Session not found.');
  }

  const existing = await db.session.findFirst({
    where: {
      id: sessionId,
      userId: ctx.userId,
    },
  });

  if (!existing) {
    throw new NotFoundError('Session not found.');
  }

  await revokeSession(sessionId, ctx.userId);

  await db.loginEvent.create({
    data: {
      userId: ctx.userId,
      type: 'session_revoked',
    },
  }).catch(() => {});

  return ok({ message: 'Session successfully revoked.' });
});
