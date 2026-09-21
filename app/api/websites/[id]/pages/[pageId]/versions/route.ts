import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';

export const GET = withHandler(async (req: Request, { params }: { params: { id: string; pageId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const page = await prisma.page.findFirst({
    where: {
      id: params.pageId,
      websiteId: params.id,
    },
  });

  if (!page) {
    return fail(404, 'NOT_FOUND', 'Page not found');
  }

  const versions = await prisma.pageVersion.findMany({
    where: { pageId: page.id },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = versions.map((v) => ({
    ...v,
    snapshot: (() => {
      try {
        return typeof v.snapshot === 'string' ? JSON.parse(v.snapshot) : v.snapshot;
      } catch {
        return v.snapshot;
      }
    })(),
  }));

  return ok({ versions: formatted });
});
