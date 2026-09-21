import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireWebsiteAccess, AuthContext } from '@/lib/auth/context';
import { NotFoundError } from '@/lib/http/errors';
import { db } from '@/lib/db/prisma';

vi.mock('@/lib/db/prisma', () => ({
  db: {
    website: {
      findFirst: vi.fn(),
    },
    websiteAccess: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Multi-Tenancy & Data Isolation (Part 1 §5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const orgAContext: AuthContext = {
    userId: 'user-org-a',
    email: 'owner@orga.com',
    organizationId: 'org-a-id',
    organizationName: 'Org A',
    role: 'OWNER',
    sessionId: 'session-a',
  };

  const managerOrgAContext: AuthContext = {
    userId: 'manager-org-a',
    email: 'manager@orga.com',
    organizationId: 'org-a-id',
    organizationName: 'Org A',
    role: 'MANAGER',
    sessionId: 'session-m-a',
  };

  it('should allow Owner to access verified website belonging to their organization', async () => {
    (db.website.findFirst as any).mockResolvedValue({
      id: 'website-a-1',
      organizationId: 'org-a-id',
      name: 'Org A Main Site',
      domain: 'orga.com',
    });

    const website = await requireWebsiteAccess(orgAContext, 'website-a-1');
    expect(website.id).toBe('website-a-1');
    expect(db.website.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'website-a-1',
        organizationId: 'org-a-id',
      },
      select: expect.any(Object),
    });
  });

  it('should strictly return 404 NotFoundError when attempting to access a website from another organization (Org B)', async () => {
    // Attempting to query website from Org B with Org A context returns null because query scopes by organizationId
    (db.website.findFirst as any).mockResolvedValue(null);

    await expect(
      requireWebsiteAccess(orgAContext, 'website-org-b-secret')
    ).rejects.toThrow(NotFoundError);
  });

  it('should reject Manager access to a website in their org if no WebsiteAccess row exists (returns 404 to avoid enumeration)', async () => {
    (db.website.findFirst as any).mockResolvedValue({
      id: 'website-a-2',
      organizationId: 'org-a-id',
      name: 'Org A Restricted Site',
      domain: 'restricted.orga.com',
    });

    // No WebsiteAccess granted to this manager
    (db.websiteAccess.findUnique as any).mockResolvedValue(null);

    await expect(
      requireWebsiteAccess(managerOrgAContext, 'website-a-2')
    ).rejects.toThrow(NotFoundError);
  });

  it('should allow Manager access to a website in their org if explicit WebsiteAccess exists', async () => {
    (db.website.findFirst as any).mockResolvedValue({
      id: 'website-a-3',
      organizationId: 'org-a-id',
      name: 'Org A Assigned Site',
      domain: 'assigned.orga.com',
    });

    (db.websiteAccess.findUnique as any).mockResolvedValue({
      websiteId: 'website-a-3',
      userId: 'manager-org-a',
    });

    const site = await requireWebsiteAccess(managerOrgAContext, 'website-a-3');
    expect(site.id).toBe('website-a-3');
  });
});
