import { PrismaClient } from '@prisma/client';

export const DEMO_PATTERNS = {
  clients: ['amary beaute', 'finansh', 'mini garage', 'soché', 'soche', 'therma by eureka'],
  domains: ['amarybeaute.com', 'finansh.io', 'soche.design', 'therma.eureka.in', 'mini-garage.example', 'tythas.example'],
  emails: ['@tythas.example', '@example.com'],
};

export interface AuditFinding {
  table: string;
  id: string;
  field: string;
  value: string;
  matchedPattern: string;
}

export async function auditDatabaseForDemoData(prisma: PrismaClient): Promise<{
  clean: boolean;
  findings: AuditFinding[];
}> {
  const findings: AuditFinding[] = [];

  // 1. Audit Clients
  const clients = await prisma.client.findMany({
    select: { id: true, name: true, contactEmail: true },
  });

  for (const c of clients) {
    const lowerName = c.name.toLowerCase();
    for (const pattern of DEMO_PATTERNS.clients) {
      if (lowerName.includes(pattern)) {
        findings.push({
          table: 'Client',
          id: c.id,
          field: 'name',
          value: c.name,
          matchedPattern: pattern,
        });
      }
    }
  }

  // 2. Audit Websites
  const websites = await prisma.website.findMany({
    select: { id: true, name: true, domain: true },
  });

  for (const w of websites) {
    const lowerDomain = w.domain.toLowerCase();
    const lowerName = w.name.toLowerCase();

    for (const pattern of DEMO_PATTERNS.domains) {
      if (lowerDomain.includes(pattern)) {
        findings.push({
          table: 'Website',
          id: w.id,
          field: 'domain',
          value: w.domain,
          matchedPattern: pattern,
        });
      }
    }

    for (const pattern of DEMO_PATTERNS.clients) {
      if (lowerName.includes(pattern)) {
        findings.push({
          table: 'Website',
          id: w.id,
          field: 'name',
          value: w.name,
          matchedPattern: pattern,
        });
      }
    }
  }

  // 3. Audit Users
  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });

  for (const u of users) {
    const lowerEmail = u.email.toLowerCase();
    for (const pattern of DEMO_PATTERNS.emails) {
      if (lowerEmail.includes(pattern)) {
        findings.push({
          table: 'User',
          id: u.id,
          field: 'email',
          value: u.email,
          matchedPattern: pattern,
        });
      }
    }
  }

  return {
    clean: findings.length === 0,
    findings,
  };
}

async function runCli() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Auditing database for demo/seed data remnants...');
    const result = await auditDatabaseForDemoData(prisma);

    if (result.clean) {
      console.log('✅ PASS: Database is clean. Zero demo/seed records detected.');
      process.exit(0);
    } else {
      console.warn(`⚠️  WARNING: Found ${result.findings.length} demo/seed record(s) in the database:\n`);
      console.table(result.findings);
      console.log('\n❌ Audit failed: Please remove or purge demo data before opening to production users.');
      process.exit(1);
    }
  } catch (err) {
    console.error('Audit execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run CLI if directly executed
if (process.argv[1]?.endsWith('audit-demo-data.ts')) {
  runCli();
}
