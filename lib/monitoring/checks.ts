import { db } from '@/lib/db/prisma';
import { checkSslCertificate } from '@/lib/crawler/crawler';
import { createNotification } from '@/lib/notifications/service';
import { checkPageSpeed } from '@/lib/monitoring/pagespeed';

// In-memory rate limiting map for on-demand check-now (2 minutes cooldown)
const lastManualCheckMap = new Map<string, number>();

export async function checkUptime(website: { id: string; domain: string; organizationId: string }) {
  const startTime = Date.now();
  let isUp = false;
  let statusText = '';
  let statusCode = 200;

  const url = `https://${website.domain}`;

  try {
    // Attempt HEAD request first, fall back to GET
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(6000),
        headers: { 'User-Agent': 'TythasMonitoring/1.0' },
      });
    } catch {
      response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(6000),
        headers: { 'User-Agent': 'TythasMonitoring/1.0' },
      });
    }

    statusCode = response.status;
    const latency = Date.now() - startTime;

    if (response.ok || (statusCode >= 300 && statusCode < 400)) {
      isUp = true;
      statusText = `Responding with ${statusCode} (~${latency}ms)`;
    } else {
      isUp = false;
      statusText = `Homepage returned HTTP ${statusCode}`;
    }
  } catch (err: any) {
    isUp = false;
    statusText = err?.name === 'TimeoutError' ? 'Connection timed out (>6s)' : 'Connection failed (unreachable host)';
  }

  const checkStatus = isUp ? 'HEALTHY' : 'CRITICAL';

  // Record check in DB
  const check = await db.monitoringCheck.create({
    data: {
      websiteId: website.id,
      type: 'UPTIME',
      status: checkStatus,
      detail: statusText,
      checkedAt: new Date(),
    },
  });

  // Incident state transitions
  const openIncident = await db.monitoringIncident.findFirst({
    where: {
      websiteId: website.id,
      type: 'UPTIME',
      resolvedAt: null,
    },
  });

  if (!isUp) {
    if (!openIncident) {
      // Open new incident
      await db.monitoringIncident.create({
        data: {
          websiteId: website.id,
          type: 'UPTIME',
          title: 'Website down',
          detail: statusText,
          startedAt: new Date(),
        },
      });

      // Fire critical notification
      await createNotification({
        organizationId: website.organizationId,
        websiteId: website.id,
        type: 'WEBSITE_DOWN',
        severity: 'CRITICAL',
        title: 'Website down',
        detail: `Homepage for ${website.domain} is currently unreachable (${statusText}).`,
        linkPath: '/monitoring',
      });
    }
  } else {
    if (openIncident) {
      // Incident resolved
      const now = new Date();
      const downDurationMs = now.getTime() - new Date(openIncident.startedAt).getTime();
      const minutesDown = Math.max(1, Math.round(downDurationMs / (1000 * 60)));

      await db.monitoringIncident.update({
        where: { id: openIncident.id },
        data: { resolvedAt: now },
      });

      // Fire recovery notification
      await createNotification({
        organizationId: website.organizationId,
        websiteId: website.id,
        type: 'WEBSITE_DOWN',
        severity: 'SUCCESS',
        title: 'Website back up',
        detail: `Homepage for ${website.domain} is responding normally (was down for ${minutesDown} minute${minutesDown === 1 ? '' : 's'}).`,
        linkPath: '/monitoring',
      });
    }
  }

  return check;
}

export async function checkSslExpiry(website: { id: string; domain: string; organizationId: string }) {
  let status: 'HEALTHY' | 'ATTENTION' | 'CRITICAL' = 'HEALTHY';
  let detail = '';
  let expiryDays = 90;

  try {
    const certInfo = await checkSslCertificate(website.domain);
    if (!certInfo.valid && certInfo.expiryDays === undefined) {
      status = 'CRITICAL';
      detail = 'Invalid or expired SSL certificate';
      expiryDays = 0;
    } else {
      expiryDays = certInfo.expiryDays ?? 90;
      if (expiryDays < 7) {
        status = 'CRITICAL';
        detail = `Certificate expires in ${expiryDays} day${expiryDays === 1 ? '' : 's'}`;
      } else if (expiryDays < 21) {
        status = 'ATTENTION';
        detail = `Certificate expires in ${expiryDays} days`;
      } else {
        status = 'HEALTHY';
        detail = `Valid TLS 1.3 certificate (expires in ${expiryDays} days)`;
      }
    }
  } catch {
    status = 'ATTENTION';
    detail = 'Could not verify TLS certificate handshake';
  }

  const check = await db.monitoringCheck.create({
    data: {
      websiteId: website.id,
      type: 'SSL_EXPIRY',
      status,
      detail,
      checkedAt: new Date(),
    },
  });

  // Deduplicated SSL notification: only send if ATTENTION or CRITICAL and not notified in the last 7 days
  if (status !== 'HEALTHY') {
    const recentSslNotification = await db.notification.findFirst({
      where: {
        websiteId: website.id,
        type: 'SSL_EXPIRY_WARNING',
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (!recentSslNotification) {
      await createNotification({
        organizationId: website.organizationId,
        websiteId: website.id,
        type: 'SSL_EXPIRY_WARNING',
        severity: status === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
        title: 'SSL certificate expiry warning',
        detail: `SSL certificate for ${website.domain} expires in ${expiryDays} days. Please renew promptly.`,
        linkPath: '/monitoring',
      });
    }
  }

  return check;
}

export async function checkCrawlSignals(website: { id: string; domain: string; organizationId: string }) {
  // Read latest analysis
  const latestAnalysis = await db.websiteAnalysis.findFirst({
    where: { websiteId: website.id, status: 'COMPLETE' },
    include: { issues: true },
    orderBy: { completedAt: 'desc' },
  });

  const pagesFound = latestAnalysis?.pagesFound ?? 0;
  const criticalCount = latestAnalysis?.issues.filter((i) => i.severity === 'CRITICAL').length ?? 0;
  const attentionCount = latestAnalysis?.issues.filter((i) => i.severity === 'ATTENTION').length ?? 0;
  const totalIssues = criticalCount + attentionCount;

  const status: 'HEALTHY' | 'ATTENTION' | 'CRITICAL' =
    criticalCount > 0 ? 'CRITICAL' : attentionCount > 0 ? 'ATTENTION' : 'HEALTHY';

  const detail = pagesFound > 0
    ? `${pagesFound} URLs checked, ${totalIssues} issues detected`
    : 'No crawl analysis recorded yet';

  const check = await db.monitoringCheck.create({
    data: {
      websiteId: website.id,
      type: 'CRAWL',
      status,
      detail,
      checkedAt: new Date(),
    },
  });

  return check;
}

/**
 * Runs all 3 operational checks for a website.
 */
export async function runWebsiteChecks(websiteId: string, isManual = false) {
  if (isManual) {
    const lastCheck = lastManualCheckMap.get(websiteId);
    if (lastCheck && Date.now() - lastCheck < 120_000) {
      // 2 minute cooldown
      const remainingSec = Math.ceil((120_000 - (Date.now() - lastCheck)) / 1000);
      throw new Error(`Rate limit exceeded. Please wait ${remainingSec} seconds before checking again.`);
    }
    lastManualCheckMap.set(websiteId, Date.now());
  }

  const website = await db.website.findUnique({
    where: { id: websiteId },
  });

  if (!website) {
    throw new Error('Website not found');
  }

  const [uptimeCheck, sslCheck, crawlCheck, performanceCheck] = await Promise.all([
    checkUptime(website),
    checkSslExpiry(website),
    checkCrawlSignals(website),
    checkPageSpeed(website),
  ]);

  return { uptimeCheck, sslCheck, crawlCheck, performanceCheck: performanceCheck.check };
}
