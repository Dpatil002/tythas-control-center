import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';

export const POST = withHandler(async (req: Request, { params }: { params: { id: string; postId: string; vId: string } }) => {
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

  const version = await prisma.blogPostVersion.findFirst({
    where: {
      id: params.vId,
      postId: post.id,
    },
  });

  if (!version) {
    return fail(404, 'NOT_FOUND', 'Version not found');
  }

  let snapshotData: any;
  try {
    snapshotData = typeof version.snapshot === 'string' ? JSON.parse(version.snapshot) : version.snapshot;
  } catch {
    return fail(400, 'INVALID_SNAPSHOT', 'Could not parse version snapshot data');
  }

  await prisma.$transaction(async (tx) => {
    await tx.blogPost.update({
      where: { id: post.id },
      data: {
        title: snapshotData.title || post.title,
        slug: snapshotData.slug || post.slug,
        content: typeof snapshotData.content === 'string' ? snapshotData.content : JSON.stringify(snapshotData.content || {}),
        authorId: snapshotData.authorId !== undefined ? snapshotData.authorId : post.authorId,
        status: 'DRAFT',
      },
    });

    await tx.blogPostVersion.create({
      data: {
        postId: post.id,
        snapshot: JSON.stringify(snapshotData),
        summary: `Restored to version from ${new Date(version.createdAt).toLocaleString()}`,
        createdBy: ctx.userId,
      },
    });
  });

  const updated = await prisma.blogPost.findUnique({
    where: { id: post.id },
    include: {
      author: true,
    },
  });

  return ok({
    success: true,
    post: {
      ...updated,
      content: (() => {
        try {
          return typeof updated?.content === 'string' ? JSON.parse(updated.content) : updated?.content;
        } catch {
          return updated?.content;
        }
      })(),
    },
    message: `Restored post to version from ${new Date(version.createdAt).toLocaleString()}`,
  });
});
