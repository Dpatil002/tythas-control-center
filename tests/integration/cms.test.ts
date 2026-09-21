import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { CustomConnector } from '@/lib/connectors/custom';
import { WordPressConnector } from '@/lib/connectors/wordpress';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

describe('Phase 3: CMS & Content Management Integration', () => {
  let orgId: string;
  let clientId: string;
  let fullWebsiteId: string;
  let auditOnlyWebsiteId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test organization
    const org = await prisma.organization.create({
      data: { name: 'Test CMS Org ' + Date.now() },
    });
    orgId = org.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `cms-tester-${Date.now()}@example.com`,
        passwordHash: 'hashed_pw',
      },
    });
    testUserId = user.id;

    // Create test client
    const client = await prisma.client.create({
      data: {
        organizationId: orgId,
        name: 'CMS Test Client',
      },
    });
    clientId = client.id;

    // Create fully connected website (Custom connector)
    const fullSite = await prisma.website.create({
      data: {
        organizationId: orgId,
        clientId: client.id,
        name: 'Full CMS Website',
        domain: `full-${Date.now()}.example.com`,
        connectorType: 'CUSTOM',
        connectionState: 'CONNECTED',
        ownershipVerifiedAt: new Date(),
      },
    });
    fullWebsiteId = fullSite.id;

    // Create audit-only website (Read-only)
    const auditSite = await prisma.website.create({
      data: {
        organizationId: orgId,
        clientId: client.id,
        name: 'Audit Only Website',
        domain: `audit-${Date.now()}.example.com`,
        connectorType: 'CUSTOM',
        connectionState: 'AUDIT_ONLY',
      },
    });
    auditOnlyWebsiteId = auditSite.id;
  });

  describe('1. Pages Management & Section Builder', () => {
    let createdPageId: string;

    it('creates a page with structured sections', async () => {
      const page = await prisma.page.create({
        data: {
          websiteId: fullWebsiteId,
          slug: '/services-test',
          title: 'Enterprise Services',
          status: 'DRAFT',
          seoTitle: 'Enterprise Services - Tythas',
          seoDescription: 'Leading enterprise solutions and CMS operations.',
          h1: 'Scalable Enterprise Web Operations',
          focusKeyword: 'enterprise web operations',
          sections: {
            create: [
              {
                type: 'hero',
                order: 0,
                content: JSON.stringify({
                  headline: 'Scalable Web Operations',
                  subheadline: 'Engineered for high performance teams.',
                  ctaText: 'Get Started',
                  ctaUrl: '#contact',
                }),
              },
              {
                type: 'features',
                order: 1,
                content: JSON.stringify({
                  title: 'Core Capabilities',
                  items: [
                    { title: 'Sub-second Speed', description: 'Optimized CWV performance' },
                    { title: 'Full Connector Sync', description: 'Bidirectional updates' },
                  ],
                }),
              },
            ],
          },
        },
        include: {
          sections: { orderBy: { order: 'asc' } },
        },
      });

      expect(page.id).toBeDefined();
      expect(page.title).toBe('Enterprise Services');
      expect(page.sections.length).toBe(2);
      expect(page.sections[0].type).toBe('hero');
      createdPageId = page.id;

      // Save initial version snapshot
      const version = await prisma.pageVersion.create({
        data: {
          pageId: page.id,
          snapshot: JSON.stringify({
            title: page.title,
            slug: page.slug,
            sections: page.sections,
          }),
          summary: 'Initial section build',
          createdBy: testUserId,
        },
      });

      expect(version.id).toBeDefined();
      expect(version.pageId).toBe(createdPageId);
    });

    it('updates sections and generates new version history', async () => {
      // Add FAQ section
      await prisma.pageSection.create({
        data: {
          pageId: createdPageId,
          type: 'faq',
          order: 2,
          content: JSON.stringify({
            title: 'Services FAQ',
            items: [{ question: 'Is migration included?', answer: 'Yes, full onboarding is covered.' }],
          }),
        },
      });

      const updatedPage = await prisma.page.findUnique({
        where: { id: createdPageId },
        include: { sections: { orderBy: { order: 'asc' } } },
      });

      expect(updatedPage?.sections.length).toBe(3);

      const v2 = await prisma.pageVersion.create({
        data: {
          pageId: createdPageId,
          snapshot: JSON.stringify({
            title: updatedPage?.title,
            slug: updatedPage?.slug,
            sections: updatedPage?.sections,
          }),
          summary: 'Added FAQ section block',
          createdBy: testUserId,
        },
      });

      const versions = await prisma.pageVersion.findMany({
        where: { pageId: createdPageId },
      });
      expect(versions.length).toBe(2);
    });

    it('publishes page and changes status to PUBLISHED', async () => {
      const page = await prisma.page.update({
        where: { id: createdPageId },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });

      expect(page.status).toBe('PUBLISHED');
      expect(page.publishedAt).not.toBeNull();
    });
  });

  describe('2. Blog Posts & Rich FAQ Nodes', () => {
    let authorId: string;
    let postId: string;

    it('creates an author profile', async () => {
      const author = await prisma.author.create({
        data: {
          websiteId: fullWebsiteId,
          name: 'Sarah Connor',
          roleLabel: 'Principal Engineer',
          bio: 'Author and web infrastructure architect.',
          xUrl: 'https://x.com/sarah',
        },
      });

      expect(author.id).toBeDefined();
      expect(author.name).toBe('Sarah Connor');
      authorId = author.id;
    });

    it('creates a blog post with custom FAQ and callout blocks in Tiptap format', async () => {
      const tiptapDoc = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Modern Web Architecture in 2026' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'An in-depth guide on modern headless and connector-driven architectures.' }],
          },
          {
            type: 'faqBlock',
            attrs: {
              question: 'Why choose structured JSON blocks over raw HTML?',
              answer: 'Structured JSON nodes ensure design-system consistency, zero XSS vulnerability, and clean schema extraction.',
            },
          },
          {
            type: 'callout',
            attrs: { tone: 'info' },
            content: [{ type: 'text', text: 'Pro Tip: Always enforce automated schema generation on publish.' }],
          },
        ],
      };

      const post = await prisma.blogPost.create({
        data: {
          websiteId: fullWebsiteId,
          authorId,
          slug: '/modern-web-architecture-2026',
          title: 'Modern Web Architecture in 2026',
          content: JSON.stringify(tiptapDoc),
          status: 'DRAFT',
          seoTitle: 'Modern Web Architecture Guide 2026',
          seoDescription: 'Comprehensive guide on connector architectures.',
          focusKeyword: 'modern web architecture',
        },
      });

      expect(post.id).toBeDefined();
      expect(post.authorId).toBe(authorId);
      expect(post.status).toBe('DRAFT');
      postId = post.id;

      // Version snapshot
      await prisma.blogPostVersion.create({
        data: {
          postId: post.id,
          snapshot: JSON.stringify(tiptapDoc),
          summary: 'Initial draft with FAQ block',
          createdBy: testUserId,
        },
      });
    });

    it('schedules a blog post for future publication', async () => {
      const scheduleTime = new Date(Date.now() + 86400000 * 3); // 3 days in future
      const updated = await prisma.blogPost.update({
        where: { id: postId },
        data: {
          status: 'SCHEDULED',
          scheduledAt: scheduleTime,
        },
      });

      expect(updated.status).toBe('SCHEDULED');
      expect(updated.scheduledAt?.getTime()).toBe(scheduleTime.getTime());
    });
  });

  describe('3. Media Library & Quality Warnings', () => {
    it('creates media with dimensions and computes quality audit warning flags', async () => {
      // 1. Normal modern WebP media
      const goodMedia = await prisma.media.create({
        data: {
          websiteId: fullWebsiteId,
          url: '/uploads/hero.webp',
          filename: 'hero.webp',
          title: 'Hero Banner Image',
          altText: 'Modern digital operations dashboard illustration',
          format: 'webp',
          sizeBytes: 120 * 1024, // 120 KB
          width: 1920,
          height: 1080,
        },
      });

      // 2. Oversized JPEG missing alt text
      const problematicMedia = await prisma.media.create({
        data: {
          websiteId: fullWebsiteId,
          url: '/uploads/large-photo.jpg',
          filename: 'large-photo.jpg',
          title: 'Large Raw Photo',
          altText: '', // missing
          format: 'jpg',
          sizeBytes: 1200 * 1024, // 1.2 MB > 500KB
          width: 4000,
          height: 3000,
        },
      });

      expect(goodMedia.altText).toBeTruthy();
      expect(goodMedia.sizeBytes).toBeLessThan(500 * 1024);

      // Verify computed warnings for problematicMedia
      const isMissingAlt = !problematicMedia.altText || problematicMedia.altText.trim() === '';
      const isOversized = (problematicMedia.sizeBytes || 0) > 500 * 1024;
      const isNonModern = !['webp', 'avif', 'svg'].includes(problematicMedia.format || '');

      expect(isMissingAlt).toBe(true);
      expect(isOversized).toBe(true);
      expect(isNonModern).toBe(true);
    });
  });

  describe('4. Navigation Manager & Hierarchy', () => {
    it('creates navigation menu and persists nested children tree', async () => {
      const menu = await prisma.navigationMenu.create({
        data: {
          websiteId: fullWebsiteId,
          name: 'Main Navigation',
          location: 'primary',
        },
      });

      // Root item: Services
      const rootServices = await prisma.navigationItem.create({
        data: {
          menuId: menu.id,
          label: 'Services',
          url: '/services',
          order: 0,
        },
      });

      // Child item 1: Cloud Operations
      const child1 = await prisma.navigationItem.create({
        data: {
          menuId: menu.id,
          parentId: rootServices.id,
          label: 'Cloud Operations',
          url: '/services/cloud',
          order: 0,
        },
      });

      // Child item 2: Enterprise SEO
      const child2 = await prisma.navigationItem.create({
        data: {
          menuId: menu.id,
          parentId: rootServices.id,
          label: 'Enterprise SEO',
          url: '/services/seo',
          order: 1,
        },
      });

      const allItems = await prisma.navigationItem.findMany({
        where: { menuId: menu.id },
        include: { children: true },
      });

      expect(allItems.length).toBe(3);
      const root = allItems.find((i) => !i.parentId);
      expect(root?.children.length).toBe(2);
    });
  });

  describe('5. Connector Write Methods & Capability Gating', () => {
    it('custom connector executes write methods cleanly', async () => {
      const custom = new CustomConnector();
      const caps = await custom.getCapabilities({ type: 'CUSTOM', sharedSecret: 'test-secret' });

      expect(caps).toContain('write:content');
      expect(caps).toContain('write:media');
      expect(caps).toContain('write:navigation');

      // Test write methods do not throw
      await expect(
        custom.updatePageContent({ domain: 'example.com' }, 'p1', [{ type: 'hero', order: 0, content: {} }])
      ).resolves.not.toThrow();

      await expect(
        custom.updatePost({ domain: 'example.com' }, 'post1', { title: 'Test Post' })
      ).resolves.not.toThrow();

      await expect(
        custom.updateNavigation({ domain: 'example.com' }, 'm1', [{ label: 'Home', url: '/' }])
      ).resolves.not.toThrow();
    });

    it('audit-only website without credentials returns read-only capabilities', async () => {
      const custom = new CustomConnector();
      const auditCaps = await custom.getCapabilities(undefined);

      expect(auditCaps).toContain('read:content');
      expect(auditCaps).not.toContain('write:content');
      expect(auditCaps).not.toContain('write:navigation');
    });
  });

  describe('6. Regression Guard: Zero ComingSoon / Stubs in Phase 3', () => {
    it('verifies that Phase 3 dashboard routes have zero ComingSoon or stub placeholder strings', () => {
      const phase3Routes = ['pages', 'blog', 'media', 'navigation'];
      const dashboardDir = join(process.cwd(), 'app', '(dashboard)');

      for (const route of phase3Routes) {
        const filePath = join(dashboardDir, route, 'page.tsx');
        const content = readFileSync(filePath, 'utf-8');

        // Check forbidden strings
        expect(content.toLowerCase()).not.toContain('arrive in phase');
        expect(content.toLowerCase()).not.toContain('coming soon');
        expect(content.toLowerCase()).not.toContain('not yet implemented');
        expect(content).not.toContain('<ComingSoon');
      }
    });
  });
});
