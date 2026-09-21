import { describe, it, expect } from 'vitest';
import { auditDatabaseForDemoData, DEMO_PATTERNS } from '@/scripts/audit-demo-data';
import { db } from '@/lib/db/prisma';

describe('Database Hygiene Demo Data Auditor', () => {
  it('detects demo clients, domains, and emails correctly', async () => {
    // Create an isolated org with a demo named website and client
    const org = await db.organization.create({ data: { name: 'Audit Test Org' } });
    const demoClient = await db.client.create({
      data: {
        organizationId: org.id,
        name: 'Amary Beaute Test',
        contactEmail: 'demo@amarybeaute.com',
      },
    });

    const demoSite = await db.website.create({
      data: {
        organizationId: org.id,
        clientId: demoClient.id,
        name: 'Amary Beaute Global',
        domain: 'amarybeaute.com',
      },
    });

    const demoUser = await db.user.create({
      data: {
        email: 'test-user@tythas.example',
        passwordHash: 'hashed123',
      },
    });

    const result = await auditDatabaseForDemoData(db as any);

    expect(result.clean).toBe(false);
    expect(result.findings.length).toBeGreaterThanOrEqual(3);

    const clientFinding = result.findings.find((f) => f.table === 'Client' && f.id === demoClient.id);
    expect(clientFinding).toBeDefined();
    expect(clientFinding?.matchedPattern).toBe('amary beaute');

    const siteFinding = result.findings.find((f) => f.table === 'Website' && f.id === demoSite.id);
    expect(siteFinding).toBeDefined();

    const userFinding = result.findings.find((f) => f.table === 'User' && f.id === demoUser.id);
    expect(userFinding).toBeDefined();

    // Clean up test rows
    await db.user.delete({ where: { id: demoUser.id } });
    await db.website.delete({ where: { id: demoSite.id } });
    await db.client.delete({ where: { id: demoClient.id } });
    await db.organization.delete({ where: { id: org.id } });
  });

  it('recognizes clean production entities without false positives', async () => {
    const org = await db.organization.create({ data: { name: 'Acme Digital Agency' } });
    const realClient = await db.client.create({
      data: {
        organizationId: org.id,
        name: 'Summit Healthcare Partners',
        contactEmail: 'contact@summithealth.co',
      },
    });

    const realSite = await db.website.create({
      data: {
        organizationId: org.id,
        clientId: realClient.id,
        name: 'Summit Health Portal',
        domain: 'summithealth.co',
      },
    });

    const findings = [];
    const lowerDomain = realSite.domain.toLowerCase();
    for (const pattern of DEMO_PATTERNS.domains) {
      if (lowerDomain.includes(pattern)) {
        findings.push(pattern);
      }
    }

    expect(findings.length).toBe(0);

    // Clean up test rows
    await db.website.delete({ where: { id: realSite.id } });
    await db.client.delete({ where: { id: realClient.id } });
    await db.organization.delete({ where: { id: org.id } });
  });
});
