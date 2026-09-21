import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { z } from 'zod';

const CreateMappingSchema = z.object({
  provider: z.enum(['GA4', 'GOOGLE_ADS', 'META']),
  externalEventName: z.string().optional(),
  externalConversionId: z.string().optional(),
});

export const POST = withHandler<{ id: string; eventId: string }>(
  async (
    req: Request,
    context: { params: { id: string; eventId: string } }
  ) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, context.params.id);

    const event = await db.conversionEvent.findFirst({
      where: {
        id: context.params.eventId,
        websiteId: context.params.id,
      },
    });

    if (!event) {
      return fail(404, 'NOT_FOUND', 'Conversion event not found');
    }

    const body = await req.json();
    const input = CreateMappingSchema.parse(body);

    // Enforce that the target provider is CONNECTED for this website
    const connection = await db.integrationConnection.findUnique({
      where: {
        websiteId_provider: {
          websiteId: context.params.id,
          provider: input.provider,
        },
      },
    });

    if (!connection || connection.status !== 'CONNECTED') {
      return fail(
        400,
        'PROVIDER_NOT_CONNECTED',
        `Cannot map event to ${input.provider}: This platform is not connected yet. Please connect ${input.provider} in the Connections tab first.`
      );
    }

    // Create or replace mapping
    const mapping = await db.conversionEventMapping.upsert({
      where: {
        conversionEventId_provider: {
          conversionEventId: event.id,
          provider: input.provider,
        },
      },
      create: {
        conversionEventId: event.id,
        provider: input.provider,
        externalEventName: input.externalEventName || null,
        externalConversionId: input.externalConversionId || null,
      },
      update: {
        externalEventName: input.externalEventName || null,
        externalConversionId: input.externalConversionId || null,
      },
    });

    return ok({
      mapping,
      message: `Successfully mapped ${event.name} to ${input.provider}`,
    });
  }
);
