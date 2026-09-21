import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { z } from 'zod';

const FormFieldSchema = z.object({
  type: z.enum(['TEXT', 'EMAIL', 'PHONE', 'NUMBER', 'DROPDOWN', 'CHECKBOX', 'RADIO', 'DATE', 'FILE', 'HIDDEN']),
  label: z.string().min(1, 'Label is required'),
  placeholder: z.string().nullable().optional(),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional().default([]),
  validation: z.string().nullable().optional(),
});

export const POST = withHandler(
  async (req: Request, { params }: { params: { id: string; formId: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const form = await db.form.findFirst({
      where: { id: params.formId, websiteId: params.id },
      include: { fields: true },
    });

    if (!form) {
      return fail(404, 'NOT_FOUND', 'Form not found.');
    }

    const body = await req.json();
    const input = FormFieldSchema.parse(body);

    const nextOrder = form.fields.length;

    const field = await db.formField.create({
      data: {
        formId: form.id,
        type: input.type,
        label: input.label,
        placeholder: input.placeholder || null,
        required: input.required,
        order: nextOrder,
        options: JSON.stringify(input.options || []),
        validation: input.validation || null,
      },
    });

    return ok({ field });
  }
);
