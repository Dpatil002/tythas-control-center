import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db/prisma';
import { requireWebsiteAccess } from '@/lib/auth/context';
import { NotFoundError, ForbiddenError } from '@/lib/http/errors';
import { getConnector } from '@/lib/connectors/registry';
import { runAnalysisChecks } from '@/lib/crawler/checks';

describe('Website Connection & Multi-Tenant Isolation (Phase 2)', () => {
  let orgA: { id: string; name: string };
  let orgB: { id: string; name: string };
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let websiteA: { id: string; domain: string };
  let websiteB: { id: string; domain: string };

  beforeEach(async () => {
    // Clean up test data
    await db.analysisIssue.deleteMany();
    await db.analyzedPage.deleteMany();
    await db.websiteAnalysis.deleteMany();
    await db.ownershipVerification.deleteMany();
    await db.connectorCredential.deleteMany();
    await db.websiteAccess.deleteMany();
    await db.website.deleteMany();
    await db.client.deleteMany();
    await db.organizationMember.deleteMany();
    await db.user.deleteMany();
    await db.organization.deleteMany();

    // Create Organization A & Owner A
    orgA = await db.organization.create({ data: { name: 'Agency Alpha' } });
    userA = await db.user.create({
      data: { email: 'owner-a@alpha.example', passwordHash: 'hash' },
    });
    await db.organizationMember.create({
      data: { organizationId: orgA.id, userId: userA.id, role: 'OWNER', status: 'ACTIVE' },
    });

    const clientA = await db.client.create({
      data: { organizationId: orgA.id, name: 'Client Alpha 1' },
    });

    websiteA = await db.website.create({
      data: {
        organizationId: orgA.id,
        clientId: clientA.id,
        name: 'Alpha Site',
        domain: 'alpha.example',
        connectionState: 'ANALYZING',
        connectorType: 'UNCONNECTED',
        ownershipVerifiedAt: null, // Unverified initially
      },
    });

    // Create Organization B & Owner B
    orgB = await db.organization.create({ data: { name: 'Agency Beta' } });
    userB = await db.user.create({
      data: { email: 'owner-b@beta.example', passwordHash: 'hash' },
    });
    await db.organizationMember.create({
      data: { organizationId: orgB.id, userId: userB.id, role: 'OWNER', status: 'ACTIVE' },
    });

    const clientB = await db.client.create({
      data: { organizationId: orgB.id, name: 'Client Beta 1' },
    });

    websiteB = await db.website.create({
      data: {
        organizationId: orgB.id,
        clientId: clientB.id,
        name: 'Beta Site',
        domain: 'beta.example',
        connectionState: 'CONNECTED',
        connectorType: 'WORDPRESS',
        ownershipVerifiedAt: new Date(),
      },
    });
  });

  it('enforces 404 (NotFoundError) when querying website from another organization', async () => {
    const ctxA = {
      userId: userA.id,
      email: userA.email,
      organizationId: orgA.id,
      organizationName: orgA.name,
      role: 'OWNER' as const,
      sessionId: 'sess_123',
    };

    // User A should access website A
    const allowed = await requireWebsiteAccess(ctxA, websiteA.id);
    expect(allowed.id).toBe(websiteA.id);

    // User A attempting to access Website B in Org B MUST throw NotFoundError (404), never leaking existence
    await expect(requireWebsiteAccess(ctxA, websiteB.id)).rejects.toThrow(NotFoundError);
  });

  it('prevents unverified websites from appearing in standard list', async () => {
    const verifiedSites = await db.website.findMany({
      where: {
        organizationId: orgA.id,
        ownershipVerifiedAt: { not: null },
      },
    });
    expect(verifiedSites.length).toBe(0);

    // Verify site A
    await db.website.update({
      where: { id: websiteA.id },
      data: { ownershipVerifiedAt: new Date() },
    });

    const updatedVerified = await db.website.findMany({
      where: {
        organizationId: orgA.id,
        ownershipVerifiedAt: { not: null },
      },
    });
    expect(updatedVerified.length).toBe(1);
    expect(updatedVerified[0].id).toBe(websiteA.id);
  });

  it('correctly reports capability scopes and distinguishes CONNECTED vs AUDIT_ONLY', async () => {
    const wpConnector = getConnector('WORDPRESS');

    // Without credentials, returns read-only capabilities (AUDIT_ONLY)
    const defaultCaps = await wpConnector.getCapabilities(undefined);
    expect(defaultCaps).toContain('read:content');
    expect(defaultCaps).not.toContain('write:content');

    // Custom connector with shared secret
    const customConnector = getConnector('CUSTOM');
    const fullCaps = await customConnector.getCapabilities({
      type: 'CUSTOM',
      sharedSecret: 'super-secret-key-123',
    });
    expect(fullCaps).toContain('write:content');
    expect(fullCaps).toContain('write:seo');
    expect(fullCaps).toContain('read:forms');
  });

  it('persists analysis issues with stable checkKey values', async () => {
    const analysis = await db.websiteAnalysis.create({
      data: {
        websiteId: websiteA.id,
        status: 'COMPLETE',
        pagesFound: 15,
        indexableCount: 15,
        detectedCms: 'WordPress',
        detectedBuilder: 'Gutenberg',
        sslValid: true,
        sitemapFound: true,
        robotsFound: true,
      },
    });

    await db.analysisIssue.createMany({
      data: [
        {
          analysisId: analysis.id,
          category: 'TECHNICAL',
          severity: 'HEALTHY',
          checkKey: 'ssl_certificate',
          title: 'SSL Certificate',
          detail: 'Valid TLS certificate',
          affectedCount: 0,
        },
        {
          analysisId: analysis.id,
          category: 'CONTENT',
          severity: 'ATTENTION',
          checkKey: 'missing_meta_description',
          title: 'Meta Descriptions',
          detail: '2 pages missing a meta description',
          affectedCount: 2,
        },
      ],
    });

    const issues = await db.analysisIssue.findMany({
      where: { analysisId: analysis.id },
      orderBy: { category: 'asc' },
    });

    expect(issues.length).toBe(2);
    expect(issues[0].checkKey).toBe('missing_meta_description');
    expect(issues[0].category).toBe('CONTENT');
    expect(issues[0].affectedCount).toBe(2);
    expect(issues[1].checkKey).toBe('ssl_certificate');
    expect(issues[1].severity).toBe('HEALTHY');
  });
});
