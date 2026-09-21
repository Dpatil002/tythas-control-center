import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { ok } from '@/lib/http/respond';
import { NotFoundError } from '@/lib/http/errors';
import { getAnalysisProgress } from '@/lib/crawler/progress-tracker';

export const GET = withHandler(async (req, { params }) => {
  const ctx = await requireOrgContext(req);
  const websiteId = params.id;

  const website = await requireWebsiteAccess(ctx, websiteId);

  // Retrieve latest analysis
  const latestAnalysis = await db.websiteAnalysis.findFirst({
    where: { websiteId: website.id },
    orderBy: { createdAt: 'desc' },
    include: {
      issues: {
        orderBy: [{ category: 'asc' }, { severity: 'asc' }],
      },
      _count: {
        select: { pages: true },
      },
    },
  });

  if (!latestAnalysis) {
    throw new NotFoundError('No analysis found for this website.');
  }

  // Get live in-memory progress if currently crawling
  const liveProgress = getAnalysisProgress(latestAnalysis.id);

  // Group issues by category for easy consumption
  const technicalIssues = latestAnalysis.issues.filter((i) => i.category === 'TECHNICAL');
  const performanceIssues = latestAnalysis.issues.filter((i) => i.category === 'PERFORMANCE');
  const contentIssues = latestAnalysis.issues.filter((i) => i.category === 'CONTENT');

  // Summary counts
  const criticalCount = latestAnalysis.issues.filter((i) => i.severity === 'CRITICAL').length;
  const attentionCount = latestAnalysis.issues.filter((i) => i.severity === 'ATTENTION').length;
  const healthyCount = latestAnalysis.issues.filter((i) => i.severity === 'HEALTHY').length;

  return ok({
    website: {
      id: website.id,
      name: website.name,
      domain: website.domain,
    },
    analysis: {
      id: latestAnalysis.id,
      status: latestAnalysis.status,
      startedAt: latestAnalysis.startedAt,
      completedAt: latestAnalysis.completedAt,
      pagesFound: latestAnalysis.pagesFound ?? latestAnalysis._count.pages,
      indexableCount: latestAnalysis.indexableCount,
      detectedCms: latestAnalysis.detectedCms,
      detectedBuilder: latestAnalysis.detectedBuilder,
      sslValid: latestAnalysis.sslValid,
      sitemapFound: latestAnalysis.sitemapFound,
      robotsFound: latestAnalysis.robotsFound,
      errorMessage: latestAnalysis.errorMessage,
      progress: liveProgress,
      counts: {
        totalIssues: criticalCount + attentionCount,
        critical: criticalCount,
        attention: attentionCount,
        healthy: healthyCount,
        pages: latestAnalysis.pagesFound ?? latestAnalysis._count.pages,
        indexable: latestAnalysis.indexableCount ?? 0,
      },
      groupedIssues: {
        technical: technicalIssues,
        performance: performanceIssues,
        content: contentIssues,
      },
      issues: latestAnalysis.issues,
    },
  });
});
