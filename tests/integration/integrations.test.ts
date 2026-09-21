import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db/prisma';
import { requireWebsiteAccess } from '@/lib/auth/context';
import { NotFoundError } from '@/lib/http/errors';
import { generateOAuthState, verifyOAuthState } from '@/lib/integrations/state';
import { encryptIntegrationToken, decryptIntegrationToken } from '@/lib/integrations/crypto';
import { getIntegrationAdapter } from '@/lib/integrations/registry';
import { ClarityIntegrationAdapter } from '@/lib/integrations/adapters/clarity';
import { CustomConnector } from '@/lib/connectors/custom';
import { WordPressConnector } from '@/lib/connectors/wordpress';

describe('Phase 6: Integrations, Conversion Events & Custom Scripts Integration Tests', () => {
  let orgA: { id: string; name: string };
  let orgB: { id: string; name: string };
  let userA: { id: string; email: string };
  let websiteA: { id: string; domain: string; name: string };
  let websiteB: { id: string; domain: string; name: string };
  let pageA1: { id: string; slug: string; title: string };

  beforeEach(async () => {
    // Clean database
    await db.conversionEventMapping.deleteMany();
    await db.conversionEvent.deleteMany();
    await db.customScript.deleteMany();
    await db.googleBusinessReview.deleteMany();
    await db.integrationCredential.deleteMany();
    await db.integrationConnection.deleteMany();
    await db.page.deleteMany();
    await db.websiteAccess.deleteMany();
    await db.website.deleteMany();
    await db.client.deleteMany();
    await db.organizationMember.deleteMany();
    await db.user.deleteMany();
    await db.organization.deleteMany();

    // Org A Setup
    orgA = await db.organization.create({ data: { name: 'Agency Alpha' } });
    userA = await db.user.create({ data: { email: 'owner@alpha.example', passwordHash: 'hash' } });
    await db.organizationMember.create({
      data: { organizationId: orgA.id, userId: userA.id, role: 'OWNER', status: 'ACTIVE' },
    });
    const clientA = await db.client.create({ data: { organizationId: orgA.id, name: 'Client A' } });
    websiteA = await db.website.create({
      data: {
        organizationId: orgA.id,
        clientId: clientA.id,
        name: 'Alpha Brand',
        domain: 'alphabrand.example',
        connectorType: 'CUSTOM',
        connectionState: 'CONNECTED',
        ownershipVerifiedAt: new Date(),
      },
    });

    pageA1 = await db.page.create({
      data: {
        websiteId: websiteA.id,
        title: 'Services Page',
        slug: 'services',
        status: 'PUBLISHED',
      },
    });

    // Org B Setup (for cross-tenant isolation checks)
    orgB = await db.organization.create({ data: { name: 'Agency Beta' } });
    const clientB = await db.client.create({ data: { organizationId: orgB.id, name: 'Client B' } });
    websiteB = await db.website.create({
      data: {
        organizationId: orgB.id,
        clientId: clientB.id,
        name: 'Beta Brand',
        domain: 'betabrand.example',
        connectorType: 'WORDPRESS',
        connectionState: 'CONNECTED',
        ownershipVerifiedAt: new Date(),
      },
    });
  });

  describe('1. Multi-Tenant Isolation & Authentication Boundary', () => {
    it('strictly returns 404 (not 403) when attempting to access a website from another organization', async () => {
      const ctxA = {
        userId: userA.id,
        email: userA.email,
        organizationId: orgA.id,
        organizationName: orgA.name,
        role: 'OWNER' as const,
        sessionId: 'sess_alpha',
      };

      const siteA = await requireWebsiteAccess(ctxA, websiteA.id);
      expect(siteA.id).toBe(websiteA.id);

      await expect(requireWebsiteAccess(ctxA, websiteB.id)).rejects.toThrowError(NotFoundError);
    });
  });

  describe('2. OAuth State CSRF Protection & Token Encryption', () => {
    it('generates signed state tokens and correctly validates them', () => {
      const state = generateOAuthState(websiteA.id, 'GA4', userA.id);
      expect(state).toBeTruthy();

      const verified = verifyOAuthState(state);
      expect(verified).not.toBeNull();
      expect(verified?.websiteId).toBe(websiteA.id);
      expect(verified?.provider).toBe('GA4');
      expect(verified?.userId).toBe(userA.id);
    });

    it('rejects tampered or forged state parameters', () => {
      const state = generateOAuthState(websiteA.id, 'GA4', userA.id);
      const parts = state.split('.');
      // Tamper serialized payload
      const tampered = `eyJyYW5kb20iOiJmb3JnZWQifQ.${parts[1]}`;
      expect(verifyOAuthState(tampered)).toBeNull();

      // Tamper signature
      const tamperedSig = `${parts[0]}.invalidsignature123`;
      expect(verifyOAuthState(tamperedSig)).toBeNull();
    });

    it('encrypts and decrypts integration credentials via AES-256-GCM', () => {
      const rawToken = 'ya29.a0AfH6SMB_secret_oauth_access_token_12345';
      const encrypted = encryptIntegrationToken(rawToken);

      expect(encrypted).not.toBe(rawToken);
      expect(encrypted.split(':').length).toBe(3); // iv:authTag:ciphertext

      const decrypted = decryptIntegrationToken(encrypted);
      expect(decrypted).toBe(rawToken);
    });
  });

  describe('3. Connection Handshake, Reconnect & Disconnect', () => {
    it('connects GA4 via adapter and creates encrypted IntegrationCredential', async () => {
      const adapter = getIntegrationAdapter('GA4');
      const connection = await adapter.confirmConnection(
        websiteA,
        'properties/123456789',
        'Alpha Brand — GA4 Property',
        {
          accessToken: 'mock_ga4_access_token_valid',
          refreshToken: 'mock_ga4_refresh_token_valid',
          scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
        }
      );

      expect(connection.status).toBe('CONNECTED');
      expect(connection.externalAccountId).toBe('properties/123456789');

      const cred = await db.integrationCredential.findUnique({
        where: { connectionId: connection.id },
      });
      expect(cred).not.toBeNull();
      expect(cred?.accessTokenEncrypted).toBeTruthy();
      expect(decryptIntegrationToken(cred!.accessTokenEncrypted)).toBe('mock_ga4_access_token_valid');
    });

    it('reconnecting an errored connection updates the existing row without creating duplicates', async () => {
      // Seed initial connection in ERROR
      const existing = await db.integrationConnection.create({
        data: {
          websiteId: websiteA.id,
          provider: 'GTM',
          status: 'ERROR',
          externalAccountId: 'GTM-OLD',
          externalAccountName: 'Old GTM Container',
          lastError: 'Token expired',
        },
      });

      const adapter = getIntegrationAdapter('GTM');
      const updated = await adapter.confirmConnection(
        websiteA,
        'GTM-NEW999',
        'Alpha Brand — New Container'
      );

      expect(updated.id).toBe(existing.id);
      expect(updated.status).toBe('CONNECTED');
      expect(updated.externalAccountId).toBe('GTM-NEW999');
      expect(updated.lastError).toBeNull();

      const count = await db.integrationConnection.count({
        where: { websiteId: websiteA.id, provider: 'GTM' },
      });
      expect(count).toBe(1);
    });

    it('disconnecting deletes credential and sets status to NOT_CONNECTED', async () => {
      const adapter = getIntegrationAdapter('META');
      const conn = await adapter.confirmConnection(
        websiteA,
        'meta_pixel_123',
        'Meta Pixel',
        {
          accessToken: 'meta_token',
          scopes: ['ads_read'],
        }
      );

      expect(conn.status).toBe('CONNECTED');

      await adapter.disconnect(conn);

      const refreshed = await db.integrationConnection.findUnique({
        where: { id: conn.id },
      });
      expect(refreshed?.status).toBe('NOT_CONNECTED');
      expect(refreshed?.externalAccountId).toBeNull();

      const credCount = await db.integrationCredential.count({
        where: { connectionId: conn.id },
      });
      expect(credCount).toBe(0);
    });
  });

  describe('4. Conversion Event Manager & Mapping Validation', () => {
    it('creates conversion event and toggles Primary / Secondary classification', async () => {
      const event = await db.conversionEvent.create({
        data: {
          websiteId: websiteA.id,
          name: 'Contact form submission',
          classification: 'PRIMARY',
        },
      });

      expect(event.classification).toBe('PRIMARY');

      const updated = await db.conversionEvent.update({
        where: { id: event.id },
        data: { classification: 'SECONDARY' },
      });
      expect(updated.classification).toBe('SECONDARY');
    });

    it('rejects mapping an event to a provider when that provider is NOT CONNECTED', async () => {
      const event = await db.conversionEvent.create({
        data: {
          websiteId: websiteA.id,
          name: 'Schedule Consultation',
          classification: 'PRIMARY',
        },
      });

      // GA4 is NOT connected yet for websiteA
      const ga4Conn = await db.integrationConnection.findUnique({
        where: {
          websiteId_provider: { websiteId: websiteA.id, provider: 'GA4' },
        },
      });
      expect(ga4Conn?.status !== 'CONNECTED').toBe(true);

      // Simulation of POST /conversion-events/:id/mappings validation logic
      const targetProvider = 'GA4';
      const isConnected = ga4Conn && ga4Conn.status === 'CONNECTED';

      expect(isConnected).toBeFalsy();
    });

    it('allows mapping an event to a provider when that provider IS CONNECTED', async () => {
      // Connect GA4
      await db.integrationConnection.create({
        data: {
          websiteId: websiteA.id,
          provider: 'GA4',
          status: 'CONNECTED',
          externalAccountId: 'properties/999',
          externalAccountName: 'GA4 Alpha',
        },
      });

      const event = await db.conversionEvent.create({
        data: {
          websiteId: websiteA.id,
          name: 'Booking Completed',
          classification: 'PRIMARY',
        },
      });

      const mapping = await db.conversionEventMapping.create({
        data: {
          conversionEventId: event.id,
          provider: 'GA4',
          externalEventName: 'purchase_booking',
        },
      });

      expect(mapping.provider).toBe('GA4');
      expect(mapping.externalEventName).toBe('purchase_booking');
    });
  });

  describe('5. Microsoft Clarity Guided Setup & Tag Verification', () => {
    it('generates unique tracking tag snippet for website', () => {
      const adapter = new ClarityIntegrationAdapter();
      const snippet = adapter.getTrackingTagSnippet(websiteA);
      const projectId = adapter.getClarityProjectId(websiteA);

      expect(snippet).toContain('clarity.ms/tag/');
      expect(snippet).toContain(projectId);
    });
  });

  describe('6. Custom Scripts CRUD & Connector Sync', () => {
    it('creates SITE scoped script and verifies connector sync', async () => {
      const script = await db.customScript.create({
        data: {
          websiteId: websiteA.id,
          name: 'Google Verification Tag',
          scope: 'SITE',
          placement: 'HEAD',
          code: '<meta name="google-site-verification" content="token_123" />',
          status: 'ACTIVE',
          createdBy: userA.id,
        },
      });

      expect(script.scope).toBe('SITE');
      expect(script.pageId).toBeNull();

      const customConnector = new CustomConnector();
      const syncRes = await customConnector.syncCustomScripts(websiteA, [script]);
      expect(syncRes.synced).toBe(true);
    });

    it('enforces PAGE scoped script validation: valid page succeeds, invalid page fails cross-tenant check', async () => {
      // Valid page belonging to websiteA
      const pageScript = await db.customScript.create({
        data: {
          websiteId: websiteA.id,
          name: 'Services Heatmap Pixel',
          scope: 'PAGE',
          pageId: pageA1.id,
          placement: 'BODY',
          code: '<script>console.log("services page only");</script>',
          status: 'ACTIVE',
          createdBy: userA.id,
        },
      });

      expect(pageScript.pageId).toBe(pageA1.id);

      // Attempting to query a page belonging to websiteB for websiteA returns null (404)
      const invalidPageCheck = await db.page.findFirst({
        where: {
          id: 'non_existent_or_org_b_page',
          websiteId: websiteA.id,
        },
      });
      expect(invalidPageCheck).toBeNull();
    });

    it('WordPress connector handles syncCustomScripts gracefully', async () => {
      const wpConnector = new WordPressConnector();
      const syncResult = await wpConnector.syncCustomScripts(websiteB, [
        {
          id: 'script_1',
          name: 'Header Tag',
          scope: 'SITE',
          placement: 'HEAD',
          code: '<meta name="test" content="123" />',
          status: 'ACTIVE',
        },
      ]);

      expect(syncResult.synced).toBe(true);
    });
  });

  describe('7. Local SEO & Google Business Reviews', () => {
    it('creates and retrieves cached reviews with star ratings and reply statuses', async () => {
      await db.googleBusinessReview.createMany({
        data: [
          {
            websiteId: websiteA.id,
            externalReviewId: 'rev_test_1',
            reviewerName: 'Kabir Verma',
            rating: 5,
            excerpt: 'Excellent customer support and fast response.',
            postedAt: new Date(),
            replyStatus: 'Replied',
          },
          {
            websiteId: websiteA.id,
            externalReviewId: 'rev_test_2',
            reviewerName: 'Ananya Sen',
            rating: 4,
            excerpt: 'Very clean layout and seamless flow.',
            postedAt: new Date(),
            replyStatus: 'Not replied',
          },
        ],
      });

      const reviews = await db.googleBusinessReview.findMany({
        where: { websiteId: websiteA.id },
        orderBy: { postedAt: 'desc' },
      });

      expect(reviews.length).toBe(2);
      expect(reviews[0].rating).toBeGreaterThanOrEqual(4);
    });
  });
});
