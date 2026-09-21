import { describe, it, expect, vi } from 'vitest';
import { runWebsiteChecks, checkCrawlSignals } from '@/lib/monitoring/checks';
import { db } from '@/lib/db/prisma';

describe('Monitoring Checks Independence & Anti-Regression Suite', () => {
  it('executes completely independent monitoring checks across distinct websites without shared state', async () => {
    const org = await db.organization.create({ data: { name: 'Independence Test Org' } });
    const client = await db.client.create({
      data: {
        organizationId: org.id,
        name: 'Independence Client',
      },
    });

    const websiteA = await db.website.create({
      data: {
        organizationId: org.id,
        clientId: client.id,
        name: 'Alpha Dental Clinic',
        domain: 'alphaclinic.example',
      },
    });

    const websiteB = await db.website.create({
      data: {
        organizationId: org.id,
        clientId: client.id,
        name: 'Beta Global Logistics',
        domain: 'betalogistics.example',
      },
    });

    // Seed differing analyses for Website A and Website B
    const analysisA = await db.websiteAnalysis.create({
      data: {
        websiteId: websiteA.id,
        status: 'COMPLETE',
        pagesFound: 142,
        indexableCount: 140,
        sslValid: true,
      },
    });

    await db.analysisIssue.create({
      data: {
        analysisId: analysisA.id,
        category: 'TECHNICAL',
        severity: 'CRITICAL',
        checkKey: 'broken_links',
        title: 'Broken Links',
        detail: '3 404 links found',
        affectedCount: 3,
      },
    });

    const analysisB = await db.websiteAnalysis.create({
      data: {
        websiteId: websiteB.id,
        status: 'COMPLETE',
        pagesFound: 28,
        indexableCount: 28,
        sslValid: true,
      },
    });

    // Run crawl signals for both
    const crawlCheckA = await checkCrawlSignals(websiteA);
    const crawlCheckB = await checkCrawlSignals(websiteB);

    expect(crawlCheckA.websiteId).toBe(websiteA.id);
    expect(crawlCheckB.websiteId).toBe(websiteB.id);
    expect(crawlCheckA.id).not.toBe(crawlCheckB.id);

    // Assert differing details and status
    expect(crawlCheckA.status).toBe('CRITICAL'); // because of critical issue
    expect(crawlCheckA.detail).toBe('142 URLs checked, 1 issues detected');

    expect(crawlCheckB.status).toBe('HEALTHY'); // 0 issues
    expect(crawlCheckB.detail).toBe('28 URLs checked, 0 issues detected');

    // Run full suite check
    const resultsA = await runWebsiteChecks(websiteA.id);
    const resultsB = await runWebsiteChecks(websiteB.id);

    expect(resultsA.uptimeCheck.websiteId).toBe(websiteA.id);
    expect(resultsB.uptimeCheck.websiteId).toBe(websiteB.id);
    expect(resultsA.sslCheck.websiteId).toBe(websiteA.id);
    expect(resultsB.sslCheck.websiteId).toBe(websiteB.id);
    expect(resultsA.performanceCheck.websiteId).toBe(websiteA.id);
    expect(resultsB.performanceCheck.websiteId).toBe(websiteB.id);

    // Clean up test rows
    await db.monitoringCheck.deleteMany({ where: { websiteId: { in: [websiteA.id, websiteB.id] } } });
    await db.analysisIssue.deleteMany({ where: { analysisId: analysisA.id } });
    await db.websiteAnalysis.deleteMany({ where: { websiteId: { in: [websiteA.id, websiteB.id] } } });
    await db.website.deleteMany({ where: { id: { in: [websiteA.id, websiteB.id] } } });
    await db.organization.delete({ where: { id: org.id } });
  });
});
