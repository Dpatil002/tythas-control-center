import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';

export const PATCH = withHandler(
  async (req: Request, { params }: { params: { id: string; formId: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const form = await db.form.findFirst({
      where: {
        id: params.formId,
        websiteId: params.id,
      },
    });

    if (!form) {
      return fail(404, 'NOT_FOUND', 'Form not found.');
    }

    const body = await req.json();
    const { items } = body as { items: Array<{ id: string; order: number }> };

    if (!Array.isArray(items)) {
      return fail(400, 'BAD_REQUEST', 'Invalid items payload');
    }

    await db.$transaction(
      items.map((item) =>
        db.formField.updateMany({
          where: {
            id: item.id,
            formId: params.formId,
          },
          data: {
            order: item.order,
          },
        })
      )
    );

    const updatedFields = await db.formField.findMany({
      where: { formId: params.formId },
      orderBy: { order: 'asc' },
    });

    return ok({ fields: updatedFields });
  }
);
