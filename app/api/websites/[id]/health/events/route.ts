import { withHandler } from '@/lib/http/with-handler';
import { ok } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';

export const GET = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  const website = await requireWebsiteAccess(ctx, params.id);

  // 1. Fetch incidents
  const incidents = await db.monitoringIncident.findMany({
    where: { websiteId: website.id },
    orderBy: { startedAt: 'desc' },
    take: 20,
  });

  // 2. Fetch recent checks (to synthesize informational event rows like scheduled crawls)
  const recentChecks = await db.monitoringCheck.findMany({
    where: {
      websiteId: website.id,
      type: 'CRAWL',
    },
    orderBy: { checkedAt: 'desc' },
    take: 5,
  });

  const incidentEvents = incidents.map((inc) => ({
    id: inc.id,
    type: inc.type,
    title: inc.title,
    detail: inc.detail,
    timestamp: inc.startedAt,
    resolvedAt: inc.resolvedAt,
    status: inc.resolvedAt ? 'RESOLVED' : 'ACTIVE',
    severity: inc.resolvedAt ? 'SUCCESS' : 'CRITICAL',
  }));

  const checkEvents = recentChecks.map((chk) => ({
    id: `chk-${chk.id}`,
    type: chk.type,
    title: 'Scheduled crawl audit',
    detail: chk.detail,
    timestamp: chk.checkedAt,
    resolvedAt: chk.checkedAt,
    status: 'COMPLETED',
    severity: chk.status === 'CRITICAL' ? 'CRITICAL' : chk.status === 'ATTENTION' ? 'WARNING' : 'SUCCESS',
  }));

  // Combine and sort by timestamp desc
  const allEvents = [...incidentEvents, ...checkEvents].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return ok({
    events: allEvents.slice(0, 25),
  });
});
