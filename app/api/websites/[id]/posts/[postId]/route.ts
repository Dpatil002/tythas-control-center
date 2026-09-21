import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const UpdatePostSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-_/]+$/i, 'Invalid slug format').optional(),
  authorId: z.string().nullable().optional(),
  content: z.any().optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED']).optional(),
  scheduledAt: z.string().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
  h1: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  robotsDirective: z.string().optional(),
  focusKeyword: z.string().nullable().optional(),
  ogTitle: z.string().nullable().optional(),
  ogDescription: z.string().nullable().optional(),
  socialImageMediaId: z.string().nullable().optional(),
  saveVersion: z.boolean().optional(),
  summary: z.string().optional(),
});

export const GET = withHandler(async (req: Request, { params }: { params: { id: string; postId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const post = await prisma.blogPost.findFirst({
    where: {
      id: params.postId,
      websiteId: params.id,
    },
    include: {
      author: true,
      versions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      schemas: true,
    },
  });

  if (!post) {
    return fail(404, 'NOT_FOUND', 'Blog post not found');
  }

  const formatted = {
    ...post,
    content: (() => {
      try {
        return typeof post.content === 'string' ? JSON.parse(post.content) : post.content;
      } catch {
        return post.content;
      }
    })(),
    secondaryKeywords: (() => {
      try {
        return JSON.parse(post.secondaryKeywords);
      } catch {
        return [];
      }
    })(),
  };

  return ok({ post: formatted });
});

export const PATCH = withHandler(async (req: Request, { params }: { params: { id: string; postId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const body = await req.json();
  const input = UpdatePostSchema.parse(body);

  const existing = await prisma.blogPost.findFirst({
    where: {
      id: params.postId,
      websiteId: params.id,
    },
  });

  if (!existing) {
    return fail(404, 'NOT_FOUND', 'Blog post not found');
  }

  let normalizedSlug: string | undefined = undefined;
  if (input.slug && input.slug !== existing.slug) {
    normalizedSlug = input.slug.startsWith('/') ? input.slug : `/${input.slug}`;
    const slugTaken = await prisma.blogPost.findUnique({
      where: {
        websiteId_slug: {
          websiteId: params.id,
          slug: normalizedSlug,
        },
      },
    });
    if (slugTaken && slugTaken.id !== existing.id) {
      return fail(409, 'DUPLICATE_SLUG', `Slug "${normalizedSlug}" is already in use.`);
    }
  }

  const updateData: any = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (normalizedSlug !== undefined) updateData.slug = normalizedSlug;
  if (input.authorId !== undefined) updateData.authorId = input.authorId;
  if (input.content !== undefined) {
    updateData.content = typeof input.content === 'string' ? input.content : JSON.stringify(input.content);
  }
  if (input.status !== undefined) updateData.status = input.status;
  if (input.scheduledAt !== undefined) updateData.scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
  if (input.publishedAt !== undefined) updateData.publishedAt = input.publishedAt ? new Date(input.publishedAt) : null;
  if (input.seoTitle !== undefined) updateData.seoTitle = input.seoTitle;
  if (input.seoDescription !== undefined) updateData.seoDescription = input.seoDescription;
  if (input.h1 !== undefined) updateData.h1 = input.h1;
  if (input.canonicalUrl !== undefined) updateData.canonicalUrl = input.canonicalUrl;
  if (input.robotsDirective !== undefined) updateData.robotsDirective = input.robotsDirective;
  if (input.focusKeyword !== undefined) updateData.focusKeyword = input.focusKeyword;
  if (input.ogTitle !== undefined) updateData.ogTitle = input.ogTitle;
  if (input.ogDescription !== undefined) updateData.ogDescription = input.ogDescription;
  if (input.socialImageMediaId !== undefined) updateData.socialImageMediaId = input.socialImageMediaId;

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.blogPost.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        author: true,
      },
    });

    if (input.saveVersion) {
      await tx.blogPostVersion.create({
        data: {
          postId: existing.id,
          snapshot: JSON.stringify({
            title: res.title,
            slug: res.slug,
            content: res.content,
            authorId: res.authorId,
          }),
          summary: input.summary || 'Saved post draft version',
          createdBy: ctx.userId,
        },
      });
    }

    return res;
  });

  const formatted = {
    ...updated,
    content: (() => {
      try {
        return typeof updated.content === 'string' ? JSON.parse(updated.content) : updated.content;
      } catch {
        return updated.content;
      }
    })(),
  };

  return ok({ post: formatted });
});

export const DELETE = withHandler(async (req: Request, { params }: { params: { id: string; postId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const existing = await prisma.blogPost.findFirst({
    where: {
      id: params.postId,
      websiteId: params.id,
    },
  });

  if (!existing) {
    return fail(404, 'NOT_FOUND', 'Blog post not found');
  }

  await prisma.blogPost.delete({
    where: { id: existing.id },
  });

  return ok({ deleted: true, id: existing.id });
});
