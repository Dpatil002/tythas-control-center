import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireWebsiteAccess, requireRole } from '@/lib/auth/context';
import { updateWebsiteSchema } from '@/lib/validation/website.schema';
import { db } from '@/lib/db/prisma';
import { ok } from '@/lib/http/respond';
import { NotFoundError } from '@/lib/http/errors';

export const GET = withHandler(async (req, context) => {
  const ctx = await requireOrgContext(req);
  const websiteId = context?.params?.id as string;

  await requireWebsiteAccess(ctx, websiteId);

  const website = await db.website.findFirst({
    where: {
      id: websiteId,
      organizationId: ctx.organizationId,
    },
    include: {
      client: true,
      access: {
        include: {
          user: {
            select: { id: true, email: true },
          },
        },
      },
    },
  });

  if (!website) {
    throw new NotFoundError('Website not found.');
  }

  return ok({ website });
});

export const PATCH = withHandler(async (req, context) => {
  const ctx = await requireOrgContext(req);
  requireRole(ctx, 'OWNER');
  const websiteId = context?.params?.id as string;

  await requireWebsiteAccess(ctx, websiteId);

  const body = await req.json();
  const input = updateWebsiteSchema.parse(body);

  const updated = await db.website.update({
    where: { id: websiteId },
    data: {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.timezone ? { timezone: input.timezone } : {}),
    },
    include: {
      client: true,
    },
  });

  return ok({ website: updated });
});
