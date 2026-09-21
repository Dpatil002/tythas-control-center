import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { fail } from '@/lib/http/respond';
import { GET as versionsGet } from '../../../websites/[id]/posts/[postId]/versions/route';

export const GET = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  const post = await prisma.blogPost.findUnique({ where: { id: params.id } });
  if (!post) return fail(404, 'NOT_FOUND', 'Blog post not found');
  await requireWebsiteAccess(ctx, post.websiteId);
  return versionsGet(req, { params: { id: post.websiteId, postId: params.id } });
});
