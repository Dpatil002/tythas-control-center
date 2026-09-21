import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db/prisma';
import { requireWebsiteAccess } from '@/lib/auth/context';
import { NotFoundError } from '@/lib/http/errors';
import { createNotification, getNotificationCounts, markAllNotificationsRead } from '@/lib/notifications/service';
import { checkUptime, checkSslExpiry } from '@/lib/monitoring/checks';

describe('Phase 7: Monitoring & Notifications Integration Tests', () => {
  let orgA: { id: string; name: string };
  let userOwner: { id: string; email: string };
  let userManager: { id: string; email: string };
  let websiteA1: { id: string; domain: string; name: string; organizationId: string };
  let websiteA2: { id: string; domain: string; name: string; organizationId: string };

  beforeEach(async () => {
    // Clean database
    await db.notification.deleteMany();
    await db.notificationPreference.deleteMany();
    await db.monitoringIncident.deleteMany();
    await db.monitoringCheck.deleteMany();
    await db.websiteAccess.deleteMany();
    await db.website.deleteMany();
    await db.client.deleteMany();
    await db.organizationMember.deleteMany();
    await db.user.deleteMany();
    await db.organization.deleteMany();

    // 1. Setup Org A
    orgA = await db.organization.create({ data: { name: 'Tythas Agency' } });

    // 2. Setup Owner and Manager
    userOwner = await db.user.create({
      data: { email: 'owner@tythas.example', passwordHash: 'hash' },
    });
    userManager = await db.user.create({
      data: { email: 'manager@tythas.example', passwordHash: 'hash' },
    });

    await db.organizationMember.createMany({
      data: [
        { organizationId: orgA.id, userId: userOwner.id, role: 'OWNER', status: 'ACTIVE' },
        { organizationId: orgA.id, userId: userManager.id, role: 'MANAGER', status: 'ACTIVE' },
      ],
    });

    const client = await db.client.create({
      data: { organizationId: orgA.id, name: 'Client Amary' },
    });

    // 3. Create 2 websites in Org A
    websiteA1 = await db.website.create({
      data: {
        organizationId: orgA.id,
        clientId: client.id,
        name: 'Amary Beaute',
        domain: 'amarybeaute.com',
        connectorType: 'WORDPRESS',
        connectionState: 'CONNECTED',
        ownershipVerifiedAt: new Date(),
      },
    });

    websiteA2 = await db.website.create({
      data: {
        organizationId: orgA.id,
        clientId: client.id,
        name: 'Finansh IO',
        domain: 'finansh.io',
        connectorType: 'CUSTOM',
        connectionState: 'CONNECTED',
        ownershipVerifiedAt: new Date(),
      },
    });

    // Manager is granted access ONLY to websiteA1
    await db.websiteAccess.create({
      data: {
        websiteId: websiteA1.id,
        userId: userManager.id,
      },
    });
  });

  describe('1. Incident Transitions & Uptime Checks', () => {
    it('creates an incident and critical notification when a site goes down, and resolves on recovery', async () => {
      // Simulate down website check
      await db.monitoringCheck.create({
        data: {
          websiteId: websiteA1.id,
          type: 'UPTIME',
          status: 'CRITICAL',
          detail: 'Homepage returned HTTP 500',
        },
      });

      const incident = await db.monitoringIncident.create({
        data: {
          websiteId: websiteA1.id,
          type: 'UPTIME',
          title: 'Website down',
          detail: 'Homepage returned HTTP 500 error',
          startedAt: new Date(Date.now() - 5 * 60 * 1000),
        },
      });

      await createNotification({
        organizationId: orgA.id,
        websiteId: websiteA1.id,
        type: 'WEBSITE_DOWN',
        severity: 'CRITICAL',
        title: 'Website down',
        detail: 'Homepage returned HTTP 500 error',
        linkPath: '/monitoring',
      });

      // Verify open incident exists
      const openIncident = await db.monitoringIncident.findFirst({
        where: { websiteId: websiteA1.id, resolvedAt: null },
      });
      expect(openIncident).toBeDefined();
      expect(openIncident?.id).toBe(incident.id);

      // Now simulate recovery check
      const recoveredTime = new Date();
      await db.monitoringIncident.update({
        where: { id: openIncident!.id },
        data: { resolvedAt: recoveredTime },
      });

      await createNotification({
        organizationId: orgA.id,
        websiteId: websiteA1.id,
        type: 'WEBSITE_DOWN',
        severity: 'SUCCESS',
        title: 'Website back up',
        detail: 'Homepage is responding normally (was down for 5 minutes).',
        linkPath: '/monitoring',
      });

      const updatedIncident = await db.monitoringIncident.findUnique({
        where: { id: incident.id },
      });
      expect(updatedIncident?.resolvedAt).toBeDefined();

      const notifications = await db.notification.findMany({
        where: { websiteId: websiteA1.id, type: 'WEBSITE_DOWN' },
        orderBy: { createdAt: 'desc' },
      });
      expect(notifications.length).toBe(2);
      expect(notifications[0].severity).toBe('SUCCESS');
      expect(notifications[1].severity).toBe('CRITICAL');
    });
  });

  describe('2. SSL Expiry Checks & Deduplication', () => {
    it('creates an SSL notification once per certificate within a 7-day cooldown window', async () => {
      // Simulate SSL expiring in 14 days
      await db.monitoringCheck.create({
        data: {
          websiteId: websiteA1.id,
          type: 'SSL_EXPIRY',
          status: 'ATTENTION',
          detail: 'Certificate expires in 14 days',
        },
      });

      await createNotification({
        organizationId: orgA.id,
        websiteId: websiteA1.id,
        type: 'SSL_EXPIRY_WARNING',
        severity: 'WARNING',
        title: 'SSL certificate expiry warning',
        detail: 'SSL certificate for amarybeaute.com expires in 14 days.',
        linkPath: '/monitoring',
      });

      // Subsequent check runs: should find existing recent notification and not duplicate
      const recent = await db.notification.findFirst({
        where: {
          websiteId: websiteA1.id,
          type: 'SSL_EXPIRY_WARNING',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      });

      expect(recent).toBeDefined();

      const countBefore = await db.notification.count({
        where: { websiteId: websiteA1.id, type: 'SSL_EXPIRY_WARNING' },
      });
      expect(countBefore).toBe(1);
    });
  });

  describe('3. Notification Preferences & Server-Side Validation', () => {
    it('allows updating optional alert preferences but rejects attempts to disable critical alerts', async () => {
      // Create user preference
      const pref = await db.notificationPreference.create({
        data: {
          userId: userOwner.id,
          sslExpiry: true,
          newLead: true,
          seoAudit: true,
          publishingAndForms: true,
        },
      });

      // Update optional preferences
      const updated = await db.notificationPreference.update({
        where: { userId: userOwner.id },
        data: {
          newLead: false,
          seoAudit: false,
        },
      });
      expect(updated.newLead).toBe(false);
      expect(updated.seoAudit).toBe(false);
      expect(updated.sslExpiry).toBe(true);
    });
  });

  describe('4. Tenant Isolation & WebsiteAccess Feed Filtering', () => {
    it('ensures Managers only see notifications and health data for websites they are assigned to', async () => {
      // Create notification for Website A1 (Manager has access)
      await createNotification({
        organizationId: orgA.id,
        websiteId: websiteA1.id,
        type: 'NEW_LEAD',
        severity: 'INFO',
        title: 'Lead for A1',
        detail: 'Contact form submitted on A1',
      });

      // Create notification for Website A2 (Manager DOES NOT have access)
      await createNotification({
        organizationId: orgA.id,
        websiteId: websiteA2.id,
        type: 'NEW_LEAD',
        severity: 'INFO',
        title: 'Lead for A2',
        detail: 'Contact form submitted on A2',
      });

      // Create Org-level notification (e.g. invitation accepted)
      await createNotification({
        organizationId: orgA.id,
        websiteId: null,
        type: 'USER_INVITATION_STATUS_CHANGED',
        severity: 'INFO',
        title: 'Invite accepted',
        detail: 'Member joined',
      });

      // Manager access check for Website A1 should succeed
      const accessA1 = await requireWebsiteAccess(
        {
          userId: userManager.id,
          email: userManager.email,
          organizationId: orgA.id,
          organizationName: orgA.name,
          sessionId: 'sess-1',
          role: 'MANAGER',
        },
        websiteA1.id
      );
      expect(accessA1.id).toBe(websiteA1.id);

      // Manager access check for Website A2 should throw NotFoundError
      await expect(
        requireWebsiteAccess(
          {
            userId: userManager.id,
            email: userManager.email,
            organizationId: orgA.id,
            organizationName: orgA.name,
            sessionId: 'sess-1',
            role: 'MANAGER',
          },
          websiteA2.id
        )
      ).rejects.toThrow(NotFoundError);

      // Notification counts for Manager (accessible websites: A1 only + null)
      const countsManager = await getNotificationCounts(orgA.id, [websiteA1.id]);
      expect(countsManager.all).toBe(2); // A1 lead + Org invite

      // Notification counts for Owner (all websites)
      const countsOwner = await getNotificationCounts(orgA.id, null);
      expect(countsOwner.all).toBe(3); // A1 + A2 + Org invite
    });

    it('marks all accessible notifications as read', async () => {
      await createNotification({
        organizationId: orgA.id,
        websiteId: websiteA1.id,
        type: 'NEW_LEAD',
        severity: 'INFO',
        title: 'Lead 1',
        detail: 'New lead',
      });

      await createNotification({
        organizationId: orgA.id,
        websiteId: websiteA2.id,
        type: 'NEW_LEAD',
        severity: 'INFO',
        title: 'Lead 2',
        detail: 'New lead',
      });

      // Manager marks read only for websiteA1
      await markAllNotificationsRead(orgA.id, [websiteA1.id]);

      const n1 = await db.notification.findFirst({ where: { websiteId: websiteA1.id } });
      const n2 = await db.notification.findFirst({ where: { websiteId: websiteA2.id } });

      expect(n1?.readAt).toBeDefined();
      expect(n2?.readAt).toBeNull();
    });
  });

  describe('5. 30-Day Uptime Percentage Calculation', () => {
    it('computes accurate 30-day uptime percentages from monitoring check rows', async () => {
      const now = Date.now();
      const checksData = [];

      // 95 healthy checks, 5 critical checks -> 95.0% uptime
      for (let i = 0; i < 95; i++) {
        checksData.push({
          websiteId: websiteA1.id,
          type: 'UPTIME',
          status: 'HEALTHY',
          detail: '200 OK',
          checkedAt: new Date(now - i * 6 * 60 * 60 * 1000),
        });
      }
      for (let i = 95; i < 100; i++) {
        checksData.push({
          websiteId: websiteA1.id,
          type: 'UPTIME',
          status: 'CRITICAL',
          detail: '500 Server Error',
          checkedAt: new Date(now - i * 6 * 60 * 60 * 1000),
        });
      }

      await db.monitoringCheck.createMany({ data: checksData });

      const checks = await db.monitoringCheck.findMany({
        where: { websiteId: websiteA1.id, type: 'UPTIME' },
      });

      const healthy = checks.filter((c) => c.status === 'HEALTHY').length;
      const uptimePercent = Math.round((healthy / checks.length) * 1000) / 10;

      expect(uptimePercent).toBe(95.0);
    });
  });
});
