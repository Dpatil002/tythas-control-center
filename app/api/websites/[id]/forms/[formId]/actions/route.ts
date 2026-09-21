import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';

export const GET = withHandler(
  async (req: Request, { params }: { params: { id: string; formId: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const actions = await db.formAction.findMany({
      where: {
        formId: params.formId,
        form: { websiteId: params.id },
      },
      orderBy: { order: 'asc' },
    });

    return ok({ actions });
  }
);

export const POST = withHandler(
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
    const { type, enabled, config, order } = body;

    if (!type) {
      return fail(400, 'BAD_REQUEST', 'Action type is required');
    }

    const action = await db.formAction.create({
      data: {
        formId: params.formId,
        type,
        enabled: enabled ?? true,
        config: config ? (typeof config === 'string' ? config : JSON.stringify(config)) : '{}',
        order: order ?? 0,
      },
    });

    return ok({ action });
  }
);
