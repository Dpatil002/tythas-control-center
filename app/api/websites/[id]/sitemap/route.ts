import { withHandler } from '@/lib/http/with-handler';
import { ok } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';

export const GET = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const website = await prisma.website.findUnique({
    where: { id: params.id },
    select: {
      domain: true,
      connectionState: true,
      sitemapRuns: {
        orderBy: { generatedAt: 'desc' },
        take: 5
      },
      _count: {
        select: {
          pages: { where: { status: 'PUBLISHED' } },
          blogPosts: { where: { status: 'PUBLISHED' } }
        }
      }
    }
  });

  const latestRun = website?.sitemapRuns[0] || null;
  const publishedCount = (website?._count.pages || 0) + (website?._count.blogPosts || 0) + 1; // +1 for homepage

  return ok({
    latestRun,
    recentRuns: website?.sitemapRuns || [],
    publishedCount,
    sitemapUrl: `https://${(website?.domain || '').replace(/^https?:\/\//, '')}/sitemap.xml`
  });
});
