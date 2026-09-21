import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext } from '@/lib/auth/context';
import { createWebsiteSchema } from '@/lib/validation/website.schema';
import { db } from '@/lib/db/prisma';
import { ok, created } from '@/lib/http/respond';
import { NotFoundError, ValidationError } from '@/lib/http/errors';
import { normalizeDomain } from '@/lib/crawler/crawler';
import { runWebsiteAnalysisJob } from '@/lib/crawler/runner';

export const GET = withHandler(async (req) => {
  const ctx = await requireOrgContext(req);
  const url = new URL(req.url);
  const includeUnverified = url.searchParams.get('includeUnverified') === 'true';

  let websites;

  if (ctx.role === 'OWNER') {
    websites = await db.website.findMany({
      where: {
        organizationId: ctx.organizationId,
        ...(includeUnverified ? {} : { ownershipVerifiedAt: { not: null } }),
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
        access: {
          select: { userId: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  } else {
    // MANAGER role - only accessible verified websites
    const accessRecords = await db.websiteAccess.findMany({
      where: { userId: ctx.userId },
      select: { websiteId: true },
    });
    const accessibleWebsiteIds = accessRecords.map((a) => a.websiteId);

    websites = await db.website.findMany({
      where: {
        id: { in: accessibleWebsiteIds },
        organizationId: ctx.organizationId,
        ...(includeUnverified ? {} : { ownershipVerifiedAt: { not: null } }),
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
        access: {
          select: { userId: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  return ok({ websites });
});

export const POST = withHandler(async (req) => {
  const ctx = await requireOrgContext(req);
  const body = await req.json();
  const input = createWebsiteSchema.parse(body);

  // Validate that clientId belongs to this organization
  const client = await db.client.findFirst({
    where: {
      id: input.clientId,
      organizationId: ctx.organizationId,
    },
  });

  if (!client) {
    throw new NotFoundError('Client not found.');
  }

  const { domain } = normalizeDomain(input.domain);

  // Check unique domain in this org
  const existingDomain = await db.website.findFirst({
    where: {
      organizationId: ctx.organizationId,
      domain,
    },
  });

  if (existingDomain) {
    throw new ValidationError('A website with this domain already exists in your organization.');
  }

  // Create website with ANALYZING state and UNCONNECTED connector
  const website = await db.website.create({
    data: {
      organizationId: ctx.organizationId,
      clientId: client.id,
      name: input.name.trim(),
      domain,
      timezone: input.timezone || 'Asia/Kolkata',
      connectorType: 'UNCONNECTED',
      connectionState: 'ANALYZING',
      ownershipVerifiedAt: null,
    },
    include: {
      client: {
        select: { id: true, name: true },
      },
    },
  });

  // Create initial WebsiteAnalysis record
  const analysis = await db.websiteAnalysis.create({
    data: {
      websiteId: website.id,
      status: 'QUEUED',
    },
  });

  // Link latest analysis to website
  await db.website.update({
    where: { id: website.id },
    data: { latestAnalysisId: analysis.id },
  });

  // Kick off asynchronous background crawl
  // (In production, Inngest or background worker queue; here invoked asynchronously without blocking API response)
  runWebsiteAnalysisJob(website.id, analysis.id).catch((err) => {
    console.error(`Background crawl error for website ${website.id}:`, err);
  });

  return created({
    website,
    analysisId: analysis.id,
    message: 'Website created. Analysis started.',
  });
});
