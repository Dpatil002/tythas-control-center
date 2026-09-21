import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { created } from '@/lib/http/respond';
import { ValidationError } from '@/lib/http/errors';
import { runWebsiteAnalysisJob } from '@/lib/crawler/runner';

const RATE_LIMIT_MINUTES = 15;

export const POST = withHandler(async (req, { params }) => {
  const ctx = await requireOrgContext(req);
  const websiteId = params.id;

  const website = await requireWebsiteAccess(ctx, websiteId);

  // Check rate limit against last analysis
  const recentAnalysis = await db.websiteAnalysis.findFirst({
    where: { websiteId: website.id },
    orderBy: { createdAt: 'desc' },
  });

  if (recentAnalysis) {
    const diffMs = Date.now() - new Date(recentAnalysis.createdAt).getTime();
    const diffMinutes = diffMs / (1000 * 60);

    // If currently running or run less than 15 min ago (unless bypassed via force query in test)
    const url = new URL(req.url);
    const force = url.searchParams.get('force') === 'true';

    if (!force) {
      if (recentAnalysis.status === 'RUNNING' || recentAnalysis.status === 'QUEUED') {
        throw new ValidationError('An analysis is already in progress for this website.');
      }
      if (diffMinutes < RATE_LIMIT_MINUTES) {
        const waitMins = Math.ceil(RATE_LIMIT_MINUTES - diffMinutes);
        throw new ValidationError(
          `Analysis was run recently. Please wait ${waitMins} minute(s) before triggering a fresh crawl.`
        );
      }
    }
  }

  // Create fresh analysis record
  const analysis = await db.websiteAnalysis.create({
    data: {
      websiteId: website.id,
      status: 'QUEUED',
    },
  });

  await db.website.update({
    where: { id: website.id },
    data: { latestAnalysisId: analysis.id },
  });

  // Launch background crawl
  runWebsiteAnalysisJob(website.id, analysis.id).catch((err) => {
    console.error(`Re-run analysis error for website ${website.id}:`, err);
  });

  return created({
    analysisId: analysis.id,
    message: 'Fresh analysis initiated.',
  });
});
