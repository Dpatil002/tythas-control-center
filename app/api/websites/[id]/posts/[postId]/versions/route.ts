import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';

export const GET = withHandler(async (req: Request, { params }: { params: { id: string; postId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const post = await prisma.blogPost.findFirst({
    where: {
      id: params.postId,
      websiteId: params.id,
    },
  });

  if (!post) {
    return fail(404, 'NOT_FOUND', 'Blog post not found');
  }

  const versions = await prisma.blogPostVersion.findMany({
    where: { postId: post.id },
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
