import { withHandler } from '@/lib/http/with-handler';
import { ok } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';

export const GET = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();

  const pages = await prisma.page.findMany({
    where: {
      websiteId: params.id,
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { slug: { contains: q } }
            ]
          }
        : {})
    },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true
    },
    take: 15
  });

  const posts = await prisma.blogPost.findMany({
    where: {
      websiteId: params.id,
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { slug: { contains: q } }
            ]
          }
        : {})
    },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true
    },
    take: 15
  });

  const results = [
    ...pages.map((p) => ({
      id: p.id,
      type: 'page' as const,
      title: p.title,
      url: `/${p.slug.replace(/^\/+/, '')}`,
      status: p.status
    })),
    ...posts.map((p) => ({
      id: p.id,
      type: 'post' as const,
      title: p.title,
      url: `/blog/${p.slug.replace(/^\/+/, '')}`,
      status: p.status
    }))
  ];

  return ok({ results });
});
