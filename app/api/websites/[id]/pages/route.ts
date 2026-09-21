import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const CreatePageSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-_/]+$/i, 'Invalid slug format'),
  status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED']).default('DRAFT'),
  scheduledAt: z.string().nullable().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  h1: z.string().optional(),
  canonicalUrl: z.string().optional(),
  robotsDirective: z.string().default('INDEX_FOLLOW'),
  focusKeyword: z.string().optional(),
  sections: z.array(
    z.object({
      type: z.string(),
      order: z.number(),
      content: z.any(),
    })
  ).optional(),
});

export const GET = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const status = url.searchParams.get('status');

  const pages = await prisma.page.findMany({
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
    },
    include: {
      sections: {
        orderBy: { order: 'asc' },
      },
      _count: {
        select: {
          versions: true,
          schemas: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const formatted = pages.map((p) => ({
    ...p,
    secondaryKeywords: (() => {
      try {
        return JSON.parse(p.secondaryKeywords);
      } catch {
        return [];
      }
    })(),
    sections: p.sections.map((s) => ({
      ...s,
      content: (() => {
        try {
          return typeof s.content === 'string' ? JSON.parse(s.content) : s.content;
        } catch {
          return s.content;
        }
      })(),
    })),
  }));

  return ok({ pages: formatted, total: formatted.length });
});

export const POST = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const body = await req.json();
  const input = CreatePageSchema.parse(body);

  const normalizedSlug = input.slug.startsWith('/') ? input.slug : `/${input.slug}`;

  const existing = await prisma.page.findUnique({
    where: {
      websiteId_slug: {
        websiteId: params.id,
        slug: normalizedSlug,
      },
    },
  });

  if (existing) {
    return fail(409, 'DUPLICATE_SLUG', `A page with slug "${normalizedSlug}" already exists.`);
  }

  const sectionsToCreate = input.sections && input.sections.length > 0
    ? input.sections
    : [
        {
          type: 'hero',
          order: 0,
          content: {
            headline: input.title,
            subheadline: 'Welcome to our website.',
            ctaText: 'Get Started',
            ctaUrl: '#contact',
          },
        },
      ];

  const page = await prisma.page.create({
    data: {
      websiteId: params.id,
      slug: normalizedSlug,
      title: input.title,
      status: input.status,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      seoTitle: input.seoTitle || input.title,
      seoDescription: input.seoDescription || null,
      h1: input.h1 || input.title,
      canonicalUrl: input.canonicalUrl || null,
      robotsDirective: input.robotsDirective,
      focusKeyword: input.focusKeyword || null,
      sections: {
        create: sectionsToCreate.map((s, idx) => ({
          type: s.type,
          order: s.order ?? idx,
          content: JSON.stringify(s.content || {}),
        })),
      },
    },
    include: {
      sections: {
        orderBy: { order: 'asc' },
      },
    },
  });

  // Create initial version snapshot
  await prisma.pageVersion.create({
    data: {
      pageId: page.id,
      snapshot: JSON.stringify({
        title: page.title,
        slug: page.slug,
        sections: page.sections.map((s) => ({
          type: s.type,
          order: s.order,
          content: s.content,
        })),
      }),
      summary: 'Initial page creation',
      createdBy: ctx.userId,
    },
  });

  return ok({ page });
});
