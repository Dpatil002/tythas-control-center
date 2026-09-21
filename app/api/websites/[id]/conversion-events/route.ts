import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { z } from 'zod';

const CreateConversionEventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  classification: z.enum(['PRIMARY', 'SECONDARY']).default('SECONDARY'),
});

export const GET = withHandler(
  async (req: Request, { params }: { params: { id: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const events = await db.conversionEvent.findMany({
      where: { websiteId: params.id },
      include: {
        mappings: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Also fetch connected platforms for this website to show mapping status
    const connections = await db.integrationConnection.findMany({
      where: {
        websiteId: params.id,
        status: 'CONNECTED',
      },
    });

    return ok({
      events,
      connectedProviders: connections.map((c) => c.provider),
    });
  }
);

export const POST = withHandler(
  async (req: Request, { params }: { params: { id: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const body = await req.json();
    const input = CreateConversionEventSchema.parse(body);

    const event = await db.conversionEvent.create({
      data: {
        websiteId: params.id,
        name: input.name,
        classification: input.classification,
      },
      include: {
        mappings: true,
      },
    });

    return ok({ event, message: 'Conversion event created successfully' });
  }
);
