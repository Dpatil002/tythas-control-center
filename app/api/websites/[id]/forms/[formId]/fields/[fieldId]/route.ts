import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { z } from 'zod';

const UpdateFormFieldSchema = z.object({
  type: z.enum(['TEXT', 'EMAIL', 'PHONE', 'NUMBER', 'DROPDOWN', 'CHECKBOX', 'RADIO', 'DATE', 'FILE', 'HIDDEN']).optional(),
  label: z.string().min(1).optional(),
  placeholder: z.string().nullable().optional(),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  validation: z.string().nullable().optional(),
});

export const PATCH = withHandler(
  async (req: Request, { params }: { params: { id: string; formId: string; fieldId: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const field = await db.formField.findFirst({
      where: {
        id: params.fieldId,
        formId: params.formId,
        form: { websiteId: params.id },
      },
    });

    if (!field) {
      return fail(404, 'NOT_FOUND', 'Field not found.');
    }

    const body = await req.json();
    const input = UpdateFormFieldSchema.parse(body);

    const updated = await db.formField.update({
      where: { id: params.fieldId },
      data: {
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.placeholder !== undefined ? { placeholder: input.placeholder } : {}),
        ...(input.required !== undefined ? { required: input.required } : {}),
        ...(input.options !== undefined ? { options: JSON.stringify(input.options) } : {}),
        ...(input.validation !== undefined ? { validation: input.validation } : {}),
      },
    });

    return ok({ field: updated });
  }
);

export const DELETE = withHandler(
  async (req: Request, { params }: { params: { id: string; formId: string; fieldId: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const field = await db.formField.findFirst({
      where: {
        id: params.fieldId,
        formId: params.formId,
        form: { websiteId: params.id },
      },
    });

    if (!field) {
      return fail(404, 'NOT_FOUND', 'Field not found.');
    }

    await db.formField.delete({
      where: { id: params.fieldId },
    });

    return ok({ deleted: true });
  }
);
