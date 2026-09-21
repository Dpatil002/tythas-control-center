import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db/prisma';
import { requireWebsiteAccess } from '@/lib/auth/context';
import { NotFoundError } from '@/lib/http/errors';
import { getSitewideSeoChecklist } from '@/lib/seo/checklist';
import { generateWebsiteSitemap } from '@/lib/seo/sitemap';
import { analyzeRedirectGraph } from '@/lib/seo/redirects';

describe('Phase 4: SEO Integration Tests', () => {
  let orgA: { id: string; name: string };
  let orgB: { id: string; name: string };
  let userA: { id: string; email: string };
  let websiteA: { id: string; domain: string };
  let websiteB: { id: string; domain: string };

  beforeEach(async () => {
    // Clean up
    await db.redirect.deleteMany();
    await db.pageSchema.deleteMany();
    await db.postSchema.deleteMany();
    await db.technicalFile.deleteMany();
    await db.sitemapRun.deleteMany();
    await db.page.deleteMany();
    await db.blogPost.deleteMany();
    await db.author.deleteMany();
    await db.websiteAccess.deleteMany();
    await db.website.deleteMany();
    await db.client.deleteMany();
    await db.organizationMember.deleteMany();
    await db.user.deleteMany();
    await db.organization.deleteMany();

    // Org A
    orgA = await db.organization.create({ data: { name: 'Org Alpha' } });
    userA = await db.user.create({ data: { email: 'owner-a@alpha.example', passwordHash: 'hash' } });
    await db.organizationMember.create({
      data: { organizationId: orgA.id, userId: userA.id, role: 'OWNER', status: 'ACTIVE' }
    });
    const clientA = await db.client.create({ data: { organizationId: orgA.id, name: 'Client A' } });
    websiteA = await db.website.create({
      data: {
        organizationId: orgA.id,
        clientId: clientA.id,
        name: 'Alpha Site',
        domain: 'alpha.example',
        connectionState: 'CONNECTED',
        ownershipVerifiedAt: new Date()
      }
    });

    // Org B
    orgB = await db.organization.create({ data: { name: 'Org Beta' } });
    const clientB = await db.client.create({ data: { organizationId: orgB.id, name: 'Client B' } });
    websiteB = await db.website.create({
      data: {
        organizationId: orgB.id,
        clientId: clientB.id,
        name: 'Beta Site',
        domain: 'beta.example',
        connectionState: 'CONNECTED',
        ownershipVerifiedAt: new Date()
      }
    });
  });

  it('enforces multi-tenant isolation: accessing cross-tenant website returns 404', async () => {
    const ctxA = {
      userId: userA.id,
      email: userA.email,
      organizationId: orgA.id,
      organizationName: orgA.name,
      role: 'OWNER' as const,
      sessionId: 'sess_123'
    };

    // Access own website -> passes
    const accessed = await requireWebsiteAccess(ctxA, websiteA.id);
    expect(accessed.id).toBe(websiteA.id);

    // Access foreign website -> NotFoundError (404, not 403)
    await expect(requireWebsiteAccess(ctxA, websiteB.id)).rejects.toThrowError(NotFoundError);
  });

  it('audits sitewide SEO in real-time from live CMS database records', async () => {
    // Create Page with missing description
    await db.page.create({
      data: {
        websiteId: websiteA.id,
        slug: 'products',
        title: 'All Products',
        status: 'PUBLISHED',
        seoTitle: 'All Products — Shop Online',
        seoDescription: null, // missing description
        h1: 'All Products'
      }
    });

    // Create Page with missing title
    await db.page.create({
      data: {
        websiteId: websiteA.id,
        slug: 'contact',
        title: '',
        status: 'PUBLISHED',
        seoTitle: null, // missing title
        seoDescription: 'Get in touch with our team today.',
        h1: 'Contact Us'
      }
    });

    const checklist = await getSitewideSeoChecklist(websiteA.id);
    expect(checklist.source).toBe('cms_realtime');
    expect(checklist.summary.totalPagesAudited).toBe(2);

    const missingTitleCheck = checklist.items.find((i) => i.checkKey === 'missing_meta_title');
    expect(missingTitleCheck?.severity).toBe('CRITICAL');
    expect(missingTitleCheck?.affectedCount).toBe(1);

    const missingDescCheck = checklist.items.find((i) => i.checkKey === 'missing_meta_description');
    expect(missingDescCheck?.severity).toBe('ATTENTION');
    expect(missingDescCheck?.affectedCount).toBe(1);
  });

  it('generates XML sitemap including only PUBLISHED content', async () => {
    await db.page.create({
      data: {
        websiteId: websiteA.id,
        slug: 'published-page',
        title: 'Published Page',
        status: 'PUBLISHED'
      }
    });

    await db.page.create({
      data: {
        websiteId: websiteA.id,
        slug: 'draft-page',
        title: 'Draft Page',
        status: 'DRAFT'
      }
    });

    const result = await generateWebsiteSitemap(websiteA.id);
    expect(result.urlCount).toBe(2); // Home + published-page
    expect(result.xml).toContain('<loc>https://alpha.example/</loc>');
    expect(result.xml).toContain('<loc>https://alpha.example/published-page</loc>');
    expect(result.xml).not.toContain('draft-page');

    const sitemapRun = await db.sitemapRun.findUnique({ where: { id: result.sitemapRunId } });
    expect(sitemapRun?.urlCount).toBe(2);
  });

  it('stores and detects redirect chains and loops correctly', async () => {
    await db.redirect.create({
      data: { websiteId: websiteA.id, fromPath: '/a', toPath: '/b', type: 'R301' }
    });
    await db.redirect.create({
      data: { websiteId: websiteA.id, fromPath: '/b', toPath: '/c', type: 'R301' }
    });

    const redirects = await db.redirect.findMany({ where: { websiteId: websiteA.id } });
    const graph = analyzeRedirectGraph(redirects);

    expect(graph.chains).toHaveLength(1);
    expect(graph.chains[0].fromPath).toBe('/a');
    expect(graph.chains[0].finalDestination).toBe('/c');
    expect(graph.loops).toHaveLength(0);
  });
});
