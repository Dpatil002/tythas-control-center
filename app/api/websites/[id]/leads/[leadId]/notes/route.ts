import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';

export const POST = withHandler(
  async (req: Request, { params }: { params: { id: string; leadId: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const lead = await db.lead.findFirst({
      where: { id: params.leadId, websiteId: params.id },
    });

    if (!lead) {
      return fail(404, 'NOT_FOUND', 'Lead not found.');
    }

    const body = await req.json();
    const { note } = body;

    if (!note || typeof note !== 'string' || !note.trim()) {
      return fail(400, 'BAD_REQUEST', 'Note content is required.');
    }

    const activity = await db.leadActivity.create({
      data: {
        leadId: params.leadId,
        type: 'NOTE_ADDED',
        detail: note.trim(),
        createdBy: ctx.userId,
      },
    });

    return ok({ activity });
  }
);
