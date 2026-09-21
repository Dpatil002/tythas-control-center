import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { fail } from '@/lib/http/respond';
import { POST as restorePost } from '../../../../../websites/[id]/posts/[postId]/versions/[vId]/restore/route';

export const POST = withHandler(async (req: Request, { params }: { params: { id: string; vId: string } }) => {
  const ctx = await requireOrgContext(req);
  const post = await prisma.blogPost.findUnique({ where: { id: params.id } });
  if (!post) return fail(404, 'NOT_FOUND', 'Blog post not found');
  await requireWebsiteAccess(ctx, post.websiteId);
  return restorePost(req, { params: { id: post.websiteId, postId: params.id, vId: params.vId } });
});
