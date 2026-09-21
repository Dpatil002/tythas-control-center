import { db } from '@/lib/db/prisma';
import { executePublicCrawl } from './crawler';
import { runAnalysisChecks } from './checks';
import { setAnalysisProgress } from './progress-tracker';

/**
 * Execute a complete website analysis run in the background
 */
export async function runWebsiteAnalysisJob(websiteId: string, analysisId: string): Promise<void> {
  try {
    const website = await db.website.findUnique({
      where: { id: websiteId },
      select: { id: true, domain: true, connectionState: true },
    });

    if (!website) {
      throw new Error(`Website ${websiteId} not found`);
    }

    // Set status to RUNNING
    await db.websiteAnalysis.update({
      where: { id: analysisId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // 1. Perform public crawl
    const crawlResult = await executePublicCrawl(website.domain, analysisId);

    // 2. Run diagnostic checks
    const issues = await runAnalysisChecks(crawlResult);

    // 3. Persist analyzed pages
    const pageCreateData = crawlResult.pages.map((p) => ({
      analysisId,
      url: p.url,
      httpStatus: p.httpStatus,
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
      h1: p.h1,
      canonical: p.canonical,
      isIndexable: p.isIndexable,
      missingAltImages: p.missingAltImages,
      wordCount: p.wordCount,
    }));

    // Batch insert pages (SQLite supports chunked createMany)
    const chunkSize = 50;
    for (let i = 0; i < pageCreateData.length; i += chunkSize) {
      const chunk = pageCreateData.slice(i, i + chunkSize);
      await db.analyzedPage.createMany({
        data: chunk,
      });
    }

    // 4. Persist analysis issues
    const issueCreateData = issues.map((iss) => ({
      analysisId,
      category: iss.category,
      severity: iss.severity,
      checkKey: iss.checkKey,
      title: iss.title,
      detail: iss.detail,
      affectedCount: iss.affectedCount,
    }));

    await db.analysisIssue.createMany({
      data: issueCreateData,
    });

    // 5. Update WebsiteAnalysis to COMPLETE
    const indexableCount = crawlResult.pages.filter((p) => p.isIndexable).length;

    await db.websiteAnalysis.update({
      where: { id: analysisId },
      data: {
        status: 'COMPLETE',
        completedAt: new Date(),
        pagesFound: crawlResult.pages.length,
        indexableCount,
        detectedCms: crawlResult.detectedCms,
        detectedBuilder: crawlResult.detectedBuilder,
        sslValid: crawlResult.sslValid,
        sitemapFound: crawlResult.sitemapFound,
        robotsFound: crawlResult.robotsFound,
      },
    });

    // 6. Update Website latestAnalysisId and provisional state if ANALYZING
    const updateData: { latestAnalysisId: string; connectionState?: string } = {
      latestAnalysisId: analysisId,
    };

    if (website.connectionState === 'ANALYZING') {
      updateData.connectionState = 'AUDIT_ONLY';
    }

    await db.website.update({
      where: { id: websiteId },
      data: updateData,
    });

    setAnalysisProgress(analysisId, {
      stage: 'complete',
      stageLabel: 'Analysis completed successfully.',
      pagesCrawled: crawlResult.pages.length,
      pagesTotal: crawlResult.pages.length,
    });
  } catch (error: any) {
    console.error(`[Crawler Error] Analysis ${analysisId} failed:`, error);

    await db.websiteAnalysis.update({
      where: { id: analysisId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: error?.message || 'Unknown crawl error',
      },
    });

    setAnalysisProgress(analysisId, {
      stage: 'failed',
      stageLabel: 'Analysis failed.',
      pagesCrawled: 0,
      pagesTotal: 0,
      error: error?.message || 'An error occurred during website analysis.',
    });
  }
}
