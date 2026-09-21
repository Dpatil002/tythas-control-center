import { withHandler } from '@/lib/http/with-handler';
import { ok } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { NotFoundError } from '@/lib/http/errors';
import { z } from 'zod';

const UpdatePostSeoSchema = z.object({
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  h1: z.string().optional().nullable(),
  canonicalUrl: z.string().optional().nullable(),
  robotsDirective: z.enum(['INDEX_FOLLOW', 'NOINDEX_FOLLOW', 'NOINDEX_NOFOLLOW']).optional(),
  focusKeyword: z.string().optional().nullable(),
  secondaryKeywords: z.array(z.string()).optional(),
  ogTitle: z.string().optional().nullable(),
  ogDescription: z.string().optional().nullable(),
  socialImageMediaId: z.string().optional().nullable(),
  slug: z.string().optional(),
  createRedirect: z.boolean().optional()
});

export const GET = withHandler(async (req: Request, { params }: { params: { id: string; postId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const post = await prisma.blogPost.findFirst({
    where: { id: params.postId, websiteId: params.id },
    include: { schemas: true, author: true }
  });

  if (!post) {
    throw new NotFoundError('Blog post not found');
  }

  let secondaryKeywordsList: string[] = [];
  try {
    secondaryKeywordsList = JSON.parse(post.secondaryKeywords || '[]');
  } catch {}

  return ok({
    id: post.id,
    title: post.title,
    slug: post.slug,
    status: post.status,
    author: post.author,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    h1: post.h1,
    canonicalUrl: post.canonicalUrl,
    robotsDirective: post.robotsDirective,
    focusKeyword: post.focusKeyword,
    secondaryKeywords: secondaryKeywordsList,
    ogTitle: post.ogTitle || post.seoTitle || post.title,
    ogDescription: post.ogDescription || post.seoDescription || null,
    socialImageMediaId: post.socialImageMediaId,
    schemas: post.schemas
  });
});

export const PATCH = withHandler(async (req: Request, { params }: { params: { id: string; postId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const existing = await prisma.blogPost.findFirst({
    where: { id: params.postId, websiteId: params.id }
  });

  if (!existing) {
    throw new NotFoundError('Blog post not found');
  }

  const body = await req.json();
  const data = UpdatePostSeoSchema.parse(body);

  let redirectCreated = false;
  let newSlug = existing.slug;

  if (data.slug && data.slug.trim() !== existing.slug) {
    newSlug = data.slug.trim().replace(/^\/+/, '');
    if (existing.status === 'PUBLISHED' && data.createRedirect) {
      const oldPath = `/blog/${existing.slug.replace(/^\/+/, '')}`;
      const newPath = `/blog/${newSlug}`;

      await prisma.redirect.upsert({
        where: {
          websiteId_fromPath: {
            websiteId: params.id,
            fromPath: oldPath
          }
        },
        update: {
          toPath: newPath,
          type: 'R301'
        },
        create: {
          websiteId: params.id,
          fromPath: oldPath,
          toPath: newPath,
          type: 'R301'
        }
      });
      redirectCreated = true;
    }
  }

  const updated = await prisma.blogPost.update({
    where: { id: params.postId },
    data: {
      slug: newSlug,
      ...(data.seoTitle !== undefined ? { seoTitle: data.seoTitle } : {}),
      ...(data.seoDescription !== undefined ? { seoDescription: data.seoDescription } : {}),
      ...(data.h1 !== undefined ? { h1: data.h1 } : {}),
      ...(data.canonicalUrl !== undefined ? { canonicalUrl: data.canonicalUrl } : {}),
      ...(data.robotsDirective !== undefined ? { robotsDirective: data.robotsDirective } : {}),
      ...(data.focusKeyword !== undefined ? { focusKeyword: data.focusKeyword } : {}),
      ...(data.secondaryKeywords !== undefined ? { secondaryKeywords: JSON.stringify(data.secondaryKeywords) } : {}),
      ...(data.ogTitle !== undefined ? { ogTitle: data.ogTitle } : {}),
      ...(data.ogDescription !== undefined ? { ogDescription: data.ogDescription } : {}),
      ...(data.socialImageMediaId !== undefined ? { socialImageMediaId: data.socialImageMediaId } : {})
    }
  });

  return ok({
    post: updated,
    redirectCreated
  });
});
