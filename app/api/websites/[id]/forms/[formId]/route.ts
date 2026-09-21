import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { z } from 'zod';

const UpdateFormSchema = z.object({
  name: z.string().min(1).optional(),
  successMessage: z.string().nullable().optional(),
  redirectUrl: z.string().nullable().optional(),
  status: z.enum(['DRAFT', 'DEPLOYED']).optional(),
});

export const GET = withHandler(
  async (req: Request, { params }: { params: { id: string; formId: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const form = await db.form.findFirst({
      where: { id: params.formId, websiteId: params.id },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
        actions: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!form) {
      return fail(404, 'NOT_FOUND', 'Form not found.');
    }

    return ok({ form });
  }
);

export const PATCH = withHandler(
  async (req: Request, { params }: { params: { id: string; formId: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const form = await db.form.findFirst({
      where: { id: params.formId, websiteId: params.id },
    });

    if (!form) {
      return fail(404, 'NOT_FOUND', 'Form not found.');
    }

    const body = await req.json();
    const input = UpdateFormSchema.parse(body);

    const updated = await db.form.update({
      where: { id: params.formId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.successMessage !== undefined ? { successMessage: input.successMessage } : {}),
        ...(input.redirectUrl !== undefined ? { redirectUrl: input.redirectUrl } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
      include: {
        fields: { orderBy: { order: 'asc' } },
        actions: { orderBy: { order: 'asc' } },
      },
    });

    return ok({ form: updated });
  }
);

export const DELETE = withHandler(
  async (req: Request, { params }: { params: { id: string; formId: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const form = await db.form.findFirst({
      where: { id: params.formId, websiteId: params.id },
    });

    if (!form) {
      return fail(404, 'NOT_FOUND', 'Form not found.');
    }

    await db.form.delete({
      where: { id: params.formId },
    });

    return ok({ deleted: true });
  }
);
