import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';

export const PATCH = withHandler(
  async (
    req: Request,
    { params }: { params: { id: string; formId: string; actionId: string } }
  ) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const action = await db.formAction.findFirst({
      where: {
        id: params.actionId,
        formId: params.formId,
        form: { websiteId: params.id },
      },
    });

    if (!action) {
      return fail(404, 'NOT_FOUND', 'Form action not found.');
    }

    const body = await req.json();
    const { enabled, config, order } = body;

    const updated = await db.formAction.update({
      where: { id: params.actionId },
      data: {
        ...(enabled !== undefined && { enabled }),
        ...(config !== undefined && { config: typeof config === 'string' ? config : JSON.stringify(config) }),
        ...(order !== undefined && { order }),
      },
    });

    return ok({ action: updated });
  }
);

export const DELETE = withHandler(
  async (
    req: Request,
    { params }: { params: { id: string; formId: string; actionId: string } }
  ) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const action = await db.formAction.findFirst({
      where: {
        id: params.actionId,
        formId: params.formId,
        form: { websiteId: params.id },
      },
    });

    if (!action) {
      return fail(404, 'NOT_FOUND', 'Form action not found.');
    }

    await db.formAction.delete({
      where: { id: params.actionId },
    });

    return ok({ success: true });
  }
);
