import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { z } from 'zod';

const UpdateConversionEventSchema = z.object({
  name: z.string().min(1).optional(),
  classification: z.enum(['PRIMARY', 'SECONDARY']).optional(),
});

export const PATCH = withHandler<{ id: string; eventId: string }>(
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
    const input = UpdateConversionEventSchema.parse(body);

    const updated = await db.conversionEvent.update({
      where: { id: event.id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.classification ? { classification: input.classification } : {}),
      },
      include: {
        mappings: true,
      },
    });

    return ok({ event: updated, message: 'Conversion event updated successfully' });
  }
);

export const DELETE = withHandler<{ id: string; eventId: string }>(
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

    await db.conversionEvent.delete({
      where: { id: event.id },
    });

    return ok({ message: 'Conversion event deleted successfully' });
  }
);
