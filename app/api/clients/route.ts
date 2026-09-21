import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext } from '@/lib/auth/context';
import { createClientSchema } from '@/lib/validation/client.schema';
import { db } from '@/lib/db/prisma';
import { ok, created } from '@/lib/http/respond';

export const GET = withHandler(async (req) => {
  const ctx = await requireOrgContext(req);

  const clients = await db.client.findMany({
    where: { organizationId: ctx.organizationId },
    include: {
      websites: {
        select: {
          id: true,
          name: true,
          domain: true,
          connectionState: true,
          ownershipVerifiedAt: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return ok({ clients });
});

export const POST = withHandler(async (req) => {
  const ctx = await requireOrgContext(req);
  const body = await req.json();
  const input = createClientSchema.parse(body);

  const client = await db.client.create({
    data: {
      organizationId: ctx.organizationId,
      name: input.name.trim(),
      primaryContactName: input.primaryContactName?.trim() || null,
      contactEmail: input.contactEmail?.trim() || null,
      contactPhone: input.contactPhone?.trim() || null,
      status: input.status,
      notes: input.notes?.trim() || null,
    },
  });

  return created({ client });
});
