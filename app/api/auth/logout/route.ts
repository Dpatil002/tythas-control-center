import { withHandler } from '@/lib/http/with-handler';
import { getSession, clearSessionCookie } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { ok } from '@/lib/http/respond';

export const POST = withHandler(async (req) => {
  const session = await getSession(req);

  if (session) {
    await db.session.delete({
      where: { id: session.id },
    }).catch(() => {});
  }

  clearSessionCookie();
  return ok({ message: 'Successfully logged out.' });
});
