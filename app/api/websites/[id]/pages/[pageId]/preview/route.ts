import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';

export const GET = withHandler(async (req: Request, { params }: { params: { id: string; pageId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const website = await prisma.website.findUnique({
    where: { id: params.id },
  });

  if (!website) {
    return fail(404, 'NOT_FOUND', 'Website not found');
  }

  const page = await prisma.page.findFirst({
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

  if (!page) {
    return fail(404, 'NOT_FOUND', 'Page not found');
  }

  const sections = page.sections.map((s) => ({
    id: s.id,
    type: s.type,
    order: s.order,
    content: (() => {
      try {
        return typeof s.content === 'string' ? JSON.parse(s.content) : s.content;
      } catch {
        return s.content;
      }
    })(),
  }));

  return ok({
    preview: {
      websiteDomain: website.domain,
      pageId: page.id,
      title: page.title,
      slug: page.slug,
      status: page.status,
      seoTitle: page.seoTitle || page.title,
      seoDescription: page.seoDescription,
      h1: page.h1 || page.title,
      sections,
    },
  });
});
