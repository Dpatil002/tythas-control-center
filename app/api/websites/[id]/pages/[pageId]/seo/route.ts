import { withHandler } from '@/lib/http/with-handler';
import { ok } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { NotFoundError } from '@/lib/http/errors';
import { z } from 'zod';

const UpdateSeoSchema = z.object({
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

export const GET = withHandler(async (req: Request, { params }: { params: { id: string; pageId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const page = await prisma.page.findFirst({
    where: { id: params.pageId, websiteId: params.id },
    include: { schemas: true }
  });

  if (!page) {
    throw new NotFoundError('Page not found');
  }

  let secondaryKeywordsList: string[] = [];
  try {
    secondaryKeywordsList = JSON.parse(page.secondaryKeywords || '[]');
  } catch {}

  return ok({
    id: page.id,
    title: page.title,
    slug: page.slug,
    status: page.status,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    h1: page.h1,
    canonicalUrl: page.canonicalUrl,
    robotsDirective: page.robotsDirective,
    focusKeyword: page.focusKeyword,
    secondaryKeywords: secondaryKeywordsList,
    ogTitle: page.ogTitle || page.seoTitle || page.title,
    ogDescription: page.ogDescription || page.seoDescription || null,
    socialImageMediaId: page.socialImageMediaId,
    schemas: page.schemas
  });
});

export const PATCH = withHandler(async (req: Request, { params }: { params: { id: string; pageId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const existing = await prisma.page.findFirst({
    where: { id: params.pageId, websiteId: params.id }
  });

  if (!existing) {
    throw new NotFoundError('Page not found');
  }

  const body = await req.json();
  const data = UpdateSeoSchema.parse(body);

  let redirectCreated = false;
  let newSlug = existing.slug;

  if (data.slug && data.slug.trim() !== existing.slug) {
    newSlug = data.slug.trim().replace(/^\/+/, '');
    // If published and createRedirect is requested, create 301 redirect
    if (existing.status === 'PUBLISHED' && data.createRedirect) {
      const oldPath = `/${existing.slug.replace(/^\/+/, '')}`;
      const newPath = `/${newSlug}`;

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

  const updated = await prisma.page.update({
    where: { id: params.pageId },
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
    page: updated,
    redirectCreated
  });
});
