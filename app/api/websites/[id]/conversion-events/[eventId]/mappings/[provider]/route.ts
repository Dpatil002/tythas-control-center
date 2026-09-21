import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';

export const DELETE = withHandler<{ id: string; eventId: string; provider: string }>(
  async (
    req: Request,
    context: { params: { id: string; eventId: string; provider: string } }
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

    const upperProvider = context.params.provider.toUpperCase();

    await db.conversionEventMapping.deleteMany({
      where: {
        conversionEventId: event.id,
        provider: upperProvider,
      },
    });

    return ok({
      message: `Successfully removed ${upperProvider} mapping for ${event.name}`,
    });
  }
);
