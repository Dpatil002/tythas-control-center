import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { getConnector } from '@/lib/connectors/registry';
import { decryptConnectorData } from '@/lib/connectors/crypto';
import { createNotification } from '@/lib/notifications/service';

export const POST = withHandler(async (req: Request, { params }: { params: { id: string; postId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const website = await prisma.website.findUnique({
    where: { id: params.id },
    include: {
      credential: true,
    },
  });

  if (!website) {
    return fail(404, 'NOT_FOUND', 'Website not found');
  }

  // Capability & connection state check
  if (website.connectionState === 'AUDIT_ONLY' || website.connectionState === 'DISCONNECTED') {
    return fail(403, 'WRITE_NOT_PERMITTED', `Publishing is disabled: Website is in ${website.connectionState} mode. Direct editing requires a fully connected and verified connector.`);
  }

  const post = await prisma.blogPost.findFirst({
    where: {
      id: params.postId,
      websiteId: params.id,
    },
    include: {
      author: true,
    },
  });

  if (!post) {
    return fail(404, 'NOT_FOUND', 'Blog post not found');
  }

  let decryptedCred: any = undefined;
  if (website.credential?.encryptedData) {
    try {
      decryptedCred = decryptConnectorData(website.credential.encryptedData);
    } catch {}
  }

  const connector = getConnector(website.connectorType);
  const capabilities = await connector.getCapabilities(decryptedCred);

  if (!capabilities.includes('write:content')) {
    return fail(403, 'MISSING_CAPABILITY', 'This website connector does not have write:content capability enabled.');
  }

  let postContentJson: any;
  try {
    postContentJson = typeof post.content === 'string' ? JSON.parse(post.content) : post.content;
  } catch {
    postContentJson = post.content;
  }

  // Call connector to update and publish post
  await connector.updatePost(
    website,
    post.id,
    {
      title: post.title,
      slug: post.slug,
      content: postContentJson,
      author: post.author?.name,
    },
    decryptedCred
  );
  await connector.publishContent(website, 'post', post.id, decryptedCred);

  const published = await prisma.blogPost.update({
    where: { id: post.id },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
    include: {
      author: true,
    },
  });

  // Record publish version snapshot
  await prisma.blogPostVersion.create({
    data: {
      postId: post.id,
      snapshot: JSON.stringify({
        title: post.title,
        slug: post.slug,
        content: postContentJson,
        authorId: post.authorId,
        publishedAt: new Date().toISOString(),
      }),
      summary: 'Published post to live website',
      createdBy: ctx.userId,
    },
  });

  // Fire in-app notification
  await createNotification({
    organizationId: website.organizationId,
    websiteId: website.id,
    type: 'PUBLISHING_COMPLETED',
    severity: 'SUCCESS',
    title: 'Blog post published',
    detail: `Blog post "${post.title}" (/${post.slug}) published successfully.`,
    linkPath: `/blog`,
  });

  return ok({
    success: true,
    post: published,
    publishedAt: published.publishedAt,
    message: `Blog post "${post.title}" published successfully.`,
  });
});
