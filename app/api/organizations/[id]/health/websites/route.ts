import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';

export const GET = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);

  if (params.id !== ctx.organizationId) {
    return fail(404, 'NOT_FOUND', 'Organization not found.');
  }

  // Determine accessible website IDs for Managers
  let accessibleWebsiteIds: string[] | null = null;
  if (ctx.role !== 'OWNER') {
    const accessRecords = await db.websiteAccess.findMany({
      where: { userId: ctx.userId },
      select: { websiteId: true },
    });
    accessibleWebsiteIds = accessRecords.map((a) => a.websiteId);
  }

  const whereWebsites: any = {
    organizationId: ctx.organizationId,
  };

  if (accessibleWebsiteIds !== null) {
    whereWebsites.id = { in: accessibleWebsiteIds };
  }

  const websites = await db.website.findMany({
    where: whereWebsites,
    select: {
      id: true,
      name: true,
      domain: true,
      connectionState: true,
      connectorType: true,
      monitoringChecks: {
        orderBy: { checkedAt: 'desc' },
        take: 10,
      },
      monitoringIncidents: {
        where: { resolvedAt: null },
      },
    },
    orderBy: { name: 'asc' },
  });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const websiteStatuses = await Promise.all(
    websites.map(async (ws) => {
      const latestUptime = ws.monitoringChecks.find((c) => c.type === 'UPTIME');
      const latestSsl = ws.monitoringChecks.find((c) => c.type === 'SSL_EXPIRY');
      const latestCrawl = ws.monitoringChecks.find((c) => c.type === 'CRAWL');
      const latestPerformance = ws.monitoringChecks.find((c) => c.type === 'PERFORMANCE');

      // 30d uptime calculation
      const recentChecks = await db.monitoringCheck.findMany({
        where: {
          websiteId: ws.id,
          type: 'UPTIME',
          checkedAt: { gte: thirtyDaysAgo },
        },
        select: { status: true },
      });

      let uptimePercent = 100.0;
      if (recentChecks.length > 0) {
        const healthy = recentChecks.filter((c) => c.status === 'HEALTHY').length;
        uptimePercent = Math.round((healthy / recentChecks.length) * 1000) / 10;
      }

      let sslDays = 90;
      if (latestSsl?.detail) {
        const m = latestSsl.detail.match(/(\d+)\s*days?/i);
        if (m) sslDays = parseInt(m[1], 10);
      }

      let performanceScore = 85;
      if (latestPerformance?.detail) {
        const sm = latestPerformance.detail.match(/Performance:\s*(\d+)\/100/i);
        if (sm) performanceScore = parseInt(sm[1], 10);
      }

      const hasActiveIncident = ws.monitoringIncidents.length > 0;

      return {
        id: ws.id,
        name: ws.name,
        domain: ws.domain,
        connectionState: ws.connectionState,
        connectorType: ws.connectorType,
        uptimeStatus: hasActiveIncident ? 'CRITICAL' : latestUptime?.status || 'HEALTHY',
        uptimePercent,
        uptimeDetail: latestUptime?.detail || 'Healthy response',
        sslStatus: latestSsl?.status || 'HEALTHY',
        sslDays,
        crawlStatus: latestCrawl?.status || 'HEALTHY',
        crawlDetail: latestCrawl?.detail || 'Crawl clean',
        performanceScore,
        performanceStatus: latestPerformance?.status || 'HEALTHY',
        lastCheckedAt: latestUptime?.checkedAt || latestSsl?.checkedAt || null,
        hasActiveIncident,
      };
    })
  );

  return ok({
    websites: websiteStatuses,
  });
});
