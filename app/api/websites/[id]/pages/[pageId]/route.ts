import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const UpdatePageSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-_/]+$/i, 'Invalid slug format').optional(),
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
  summary: z.string().optional(),
  sections: z.array(
    z.object({
      id: z.string().optional(),
      type: z.string(),
      order: z.number(),
      content: z.any(),
    })
  ).optional(),
});

export const GET = withHandler(async (req: Request, { params }: { params: { id: string; pageId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const page = await prisma.page.findFirst({
    where: {
      id: params.pageId,
      websiteId: params.id,
    },
    include: {
      sections: {
        orderBy: { order: 'asc' },
      },
      versions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      schemas: true,
    },
  });

  if (!page) {
    return fail(404, 'NOT_FOUND', 'Page not found');
  }

  const formatted = {
    ...page,
    secondaryKeywords: (() => {
      try {
        return JSON.parse(page.secondaryKeywords);
      } catch {
        return [];
      }
    })(),
    sections: page.sections.map((s) => ({
      ...s,
      content: (() => {
        try {
          return typeof s.content === 'string' ? JSON.parse(s.content) : s.content;
        } catch {
          return s.content;
        }
      })(),
    })),
  };

  return ok({ page: formatted });
});

export const PATCH = withHandler(async (req: Request, { params }: { params: { id: string; pageId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const body = await req.json();
  const input = UpdatePageSchema.parse(body);

  const existing = await prisma.page.findFirst({
    where: {
      id: params.pageId,
      websiteId: params.id,
    },
    include: {
      sections: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!existing) {
    return fail(404, 'NOT_FOUND', 'Page not found');
  }

  // Check unique slug if slug is being updated
  let normalizedSlug: string | undefined = undefined;
  if (input.slug && input.slug !== existing.slug) {
    normalizedSlug = input.slug.startsWith('/') ? input.slug : `/${input.slug}`;
    const slugTaken = await prisma.page.findUnique({
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

  // Transaction for updating sections and recording version if content changed
  const result = await prisma.$transaction(async (tx) => {
    if (input.sections) {
      // Replace all sections with the updated list
      await tx.pageSection.deleteMany({
        where: { pageId: existing.id },
      });

      await tx.pageSection.createMany({
        data: input.sections.map((s, idx) => ({
          pageId: existing.id,
          type: s.type,
          order: s.order ?? idx,
          content: JSON.stringify(s.content || {}),
        })),
      });

      // Save version snapshot
      await tx.pageVersion.create({
        data: {
          pageId: existing.id,
          snapshot: JSON.stringify({
            title: input.title ?? existing.title,
            slug: normalizedSlug ?? existing.slug,
            sections: input.sections,
          }),
          summary: input.summary || 'Updated page content & sections',
          createdBy: ctx.userId,
        },
      });
    }

    const updated = await tx.page.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        sections: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return updated;
  });

  const formatted = {
    ...result,
    sections: result.sections.map((s) => ({
      ...s,
      content: (() => {
        try {
          return typeof s.content === 'string' ? JSON.parse(s.content) : s.content;
        } catch {
          return s.content;
        }
      })(),
    })),
  };

  return ok({ page: formatted });
});

export const DELETE = withHandler(async (req: Request, { params }: { params: { id: string; pageId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const existing = await prisma.page.findFirst({
    where: {
      id: params.pageId,
      websiteId: params.id,
    },
  });

  if (!existing) {
    return fail(404, 'NOT_FOUND', 'Page not found');
  }

  await prisma.page.delete({
    where: { id: existing.id },
  });

  return ok({ deleted: true, id: existing.id });
});
