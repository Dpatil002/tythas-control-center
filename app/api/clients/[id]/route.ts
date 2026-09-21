import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext } from '@/lib/auth/context';
import { updateClientSchema } from '@/lib/validation/client.schema';
import { db } from '@/lib/db/prisma';
import { ok } from '@/lib/http/respond';
import { NotFoundError } from '@/lib/http/errors';

export const GET = withHandler(async (req, context) => {
  const ctx = await requireOrgContext(req);
  const clientId = context?.params?.id as string;

  const client = await db.client.findFirst({
    where: {
      id: clientId,
      organizationId: ctx.organizationId,
    },
    include: {
      websites: true,
    },
  });

  if (!client) {
    throw new NotFoundError('Client not found.');
  }

  return ok({ client });
});

export const PATCH = withHandler(async (req, context) => {
  const ctx = await requireOrgContext(req);
  const clientId = context?.params?.id as string;
  const body = await req.json();
  const input = updateClientSchema.parse(body);

  const existing = await db.client.findFirst({
    where: {
      id: clientId,
      organizationId: ctx.organizationId,
    },
  });

  if (!existing) {
    throw new NotFoundError('Client not found.');
  }

  const updated = await db.client.update({
    where: { id: existing.id },
    data: {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.primaryContactName !== undefined ? { primaryContactName: input.primaryContactName } : {}),
      ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
      ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });

  return ok({ client: updated });
});
