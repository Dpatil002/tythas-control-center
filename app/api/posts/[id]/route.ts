import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { fail } from '@/lib/http/respond';
import { GET as postGet, PATCH as postPatch, DELETE as postDelete } from '../../websites/[id]/posts/[postId]/route';

async function getPostWebsiteId(postId: string) {
  const post = await prisma.blogPost.findUnique({ where: { id: postId } });
  return post?.websiteId;
}

export const GET = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  const websiteId = await getPostWebsiteId(params.id);
  if (!websiteId) return fail(404, 'NOT_FOUND', 'Blog post not found');
  await requireWebsiteAccess(ctx, websiteId);
  return postGet(req, { params: { id: websiteId, postId: params.id } });
});

export const PATCH = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  const websiteId = await getPostWebsiteId(params.id);
  if (!websiteId) return fail(404, 'NOT_FOUND', 'Blog post not found');
  await requireWebsiteAccess(ctx, websiteId);
  return postPatch(req, { params: { id: websiteId, postId: params.id } });
});

export const DELETE = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  const websiteId = await getPostWebsiteId(params.id);
  if (!websiteId) return fail(404, 'NOT_FOUND', 'Blog post not found');
  await requireWebsiteAccess(ctx, websiteId);
  return postDelete(req, { params: { id: websiteId, postId: params.id } });
});
