import { describe, it, expect, vi } from 'vitest';
import { parsePageSpeedResponse, checkPageSpeed } from '@/lib/monitoring/pagespeed';
import { db } from '@/lib/db/prisma';

describe('PageSpeed Insights Service', () => {
  it('correctly parses standard Lighthouse PageSpeed response', () => {
    const mockApiResponse = {
      lighthouseResult: {
        categories: {
          performance: { score: 0.94 },
        },
        audits: {
          'largest-contentful-paint': { displayValue: '1.4 s', numericValue: 1400 },
          'cumulative-layout-shift': { displayValue: '0.02', numericValue: 0.02 },
          'total-blocking-time': { displayValue: '60 ms', numericValue: 60 },
        },
      },
      loadingExperience: {
        metrics: {
          INTERACTION_TO_NEXT_PAINT: { percentile: 75 },
        },
      },
    };

    const parsed = parsePageSpeedResponse(mockApiResponse);
    expect(parsed.score).toBe(94);
    expect(parsed.status).toBe('HEALTHY');
    expect(parsed.lcp).toBe('1.4 s');
    expect(parsed.cls).toBe('0.02');
    expect(parsed.inp).toBe('75 ms');
    expect(parsed.detail).toContain('Performance: 94/100');
  });

  it('correctly classifies degraded performance score', () => {
    const mockDegradedResponse = {
      lighthouseResult: {
        categories: {
          performance: { score: 0.42 },
        },
        audits: {
          'largest-contentful-paint': { displayValue: '4.8 s' },
          'cumulative-layout-shift': { displayValue: '0.28' },
          'total-blocking-time': { displayValue: '650 ms' },
        },
      },
    };

    const parsed = parsePageSpeedResponse(mockDegradedResponse);
    expect(parsed.score).toBe(42);
    expect(parsed.status).toBe('CRITICAL');
    expect(parsed.lcp).toBe('4.8 s');
    expect(parsed.cls).toBe('0.28');
    expect(parsed.inp).toBe('650 ms');
  });

  it('falls back gracefully when API returns error or is offline', async () => {
    // Setup test website in DB
    const org = await db.organization.create({ data: { name: 'PS Test Org' } });
    const client = await db.client.create({
      data: {
        organizationId: org.id,
        name: 'PS Client',
      },
    });
    const website = await db.website.create({
      data: {
        organizationId: org.id,
        clientId: client.id,
        name: 'PS Test Site',
        domain: 'pstest.example',
      },
    });

    const mockFailingFetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const result = await checkPageSpeed(website, { fetcher: mockFailingFetch as any });

    expect(result.check.websiteId).toBe(website.id);
    expect(result.check.type).toBe('PERFORMANCE');
    expect(result.metrics.score).toBeGreaterThan(0);
    expect(result.metrics.status).toBe('ATTENTION');
  });
});
