import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const CreatePostSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-_/]+$/i, 'Invalid slug format'),
  authorId: z.string().nullable().optional(),
  content: z.any().optional(), // Tiptap JSON or string
  status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED']).default('DRAFT'),
  scheduledAt: z.string().nullable().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  h1: z.string().optional(),
  canonicalUrl: z.string().optional(),
  robotsDirective: z.string().default('INDEX_FOLLOW'),
  focusKeyword: z.string().optional(),
});

export const GET = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const status = url.searchParams.get('status');
  const authorId = url.searchParams.get('authorId');

  const posts = await prisma.blogPost.findMany({
    where: {
      websiteId: params.id,
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { slug: { contains: q } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
      ...(authorId ? { authorId } : {}),
    },
    include: {
      author: true,
      _count: {
        select: {
          versions: true,
          schemas: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const formatted = posts.map((p) => ({
    ...p,
    content: (() => {
      try {
        return typeof p.content === 'string' ? JSON.parse(p.content) : p.content;
      } catch {
        return p.content;
      }
    })(),
    secondaryKeywords: (() => {
      try {
        return JSON.parse(p.secondaryKeywords);
      } catch {
        return [];
      }
    })(),
  }));

  return ok({ posts: formatted, total: formatted.length });
});

export const POST = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const body = await req.json();
  const input = CreatePostSchema.parse(body);

  const normalizedSlug = input.slug.startsWith('/') ? input.slug : `/${input.slug}`;

  const existing = await prisma.blogPost.findUnique({
    where: {
      websiteId_slug: {
        websiteId: params.id,
        slug: normalizedSlug,
      },
    },
  });

  if (existing) {
    return fail(409, 'DUPLICATE_SLUG', `A blog post with slug "${normalizedSlug}" already exists.`);
  }

  // Default initial Tiptap document if content is empty
  const defaultContent = {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: input.title }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Start writing your post content here...' }],
      },
    ],
  };

  const initialContent = input.content ? input.content : defaultContent;

  const post = await prisma.blogPost.create({
    data: {
      websiteId: params.id,
      authorId: input.authorId || null,
      slug: normalizedSlug,
      title: input.title,
      content: JSON.stringify(initialContent),
      status: input.status,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      seoTitle: input.seoTitle || input.title,
      seoDescription: input.seoDescription || null,
      h1: input.h1 || input.title,
      canonicalUrl: input.canonicalUrl || null,
      robotsDirective: input.robotsDirective,
      focusKeyword: input.focusKeyword || null,
    },
    include: {
      author: true,
    },
  });

  // Initial version record
  await prisma.blogPostVersion.create({
    data: {
      postId: post.id,
      snapshot: JSON.stringify({
        title: post.title,
        slug: post.slug,
        content: initialContent,
        authorId: post.authorId,
      }),
      summary: 'Initial post creation',
      createdBy: ctx.userId,
    },
  });

  return ok({ post });
});
